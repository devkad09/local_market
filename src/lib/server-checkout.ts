import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from "@/lib/paystack";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CheckoutSessionInput = {
  userId: string;
  email: string;
  deliveryName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  notes?: string | null;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string | null;
  }>;
  deliveryFee?: number;
};

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: CheckoutSessionInput) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    const origin = request ? new URL(request.url).origin : "http://localhost:3000";
    const {
      userId,
      email,
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      notes,
      items,
      deliveryFee = 0,
    } = data;

    if (!userId || !items || items.length === 0) {
      throw new Error("Missing required user ID or cart items");
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const grandTotal = subtotal + deliveryFee;

    // 1. Create order record using supabaseAdmin (bypasses RLS)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        delivery_name: deliveryName.trim(),
        delivery_phone: deliveryPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        notes: notes ? notes.trim() : null,
        total: grandTotal,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Server order creation error:", orderErr);
      throw new Error(orderErr?.message ?? "Failed to create order");
    }

    const orderId = order.id;

    // 2. Create order items records using supabaseAdmin (bypasses RLS)
    const orderItemsInsert = items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(orderItemsInsert);
    if (itemsErr) {
      console.error("Server order items creation error:", itemsErr);
    }

    // 3. Initialize Paystack Transaction
    if (isPaystackConfigured()) {
      const response = await initializePaystackTransaction({
        email,
        amount: grandTotal,
        callbackUrl: `${origin}/orders?success=true&order_id=${orderId}`,
        metadata: {
          order_id: orderId,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId,
            },
          ],
        },
      });

      // Store transaction reference
      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: response.data.reference })
        .eq("id", orderId);

      return { url: response.data.authorization_url, sessionId: response.data.reference, orderId, mock: false };
    } else {
      const mockReference = `paystack_mock_${Date.now()}`;

      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: mockReference })
        .eq("id", orderId);

      const mockSuccessUrl = `${origin}/orders?success=true&reference=${mockReference}&order_id=${orderId}&mock=true`;

      return { url: mockSuccessUrl, sessionId: mockReference, orderId, mock: true };
    }
  });

export const verifyPaymentAndConfirmOrder = createServerFn({ method: "POST" })
  .validator((data: { reference: string; orderId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { reference, orderId } = data;

      // Check current order status to prevent double-processing
      const { data: order, error: fetchErr } = await supabaseAdmin
        .from("orders")
        .select("status, total")
        .eq("id", orderId)
        .single();

      if (fetchErr || !order) {
        return { success: false, error: "Order not found or database error" };
      }

      if (order.status !== "pending") {
        return { success: true, alreadyProcessed: true };
      }

      let paymentSucceeded = false;
      let transactionRef = reference;
      let finalAmount = order.total;
      let verificationErrorMessage = "Payment verification failed";

      if (reference.startsWith("paystack_mock_")) {
        paymentSucceeded = true;
      } else if (isPaystackConfigured()) {
        try {
          const response = await verifyPaystackTransaction(reference);
          if (response.status && response.data.status === "success") {
            paymentSucceeded = true;
            transactionRef = response.data.reference;
            finalAmount = response.data.amount / 100; // Paystack returns amount in pesewas
          } else {
            verificationErrorMessage = `Paystack status: ${response.data?.status || response.message || "Unverified"}`;
          }
        } catch (err: any) {
          console.error(`Paystack verification error: ${err.message}`);
          verificationErrorMessage = `Paystack API error: ${err.message}`;
        }
      } else {
        // If reference is provided from checkout return URL, treat as confirmed order
        paymentSucceeded = true;
      }

      if (paymentSucceeded) {
        // Update order status to processing
        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("id", orderId);

        if (updateErr) {
          return { success: false, error: updateErr.message };
        }

        // Insert payment success record
        const { error: payErr } = await supabaseAdmin.from("payments").insert({
          order_id: orderId,
          amount: finalAmount,
          status: "succeeded",
          transaction_ref: transactionRef,
        });

        if (payErr) {
          console.error(`Error inserting payment record: ${payErr.message}`);
        }

        console.log(`[Paystack Payment] Verified reference ${reference} for order ${orderId}.`);
        return { success: true };
      }

      return { success: false, error: verificationErrorMessage };
    } catch (err: any) {
      console.error("Catastrophic error in verifyPaymentAndConfirmOrder:", err);
      return { success: false, error: err?.message || "Payment verification failed" };
    }
  });

export const handlePaystackWebhook = createServerFn({ method: "POST" })
  .validator((data: { rawBody: string; signature: string }) => data)
  .handler(async ({ data }) => {
    const { rawBody, signature } = data;
    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid Paystack webhook signature");
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === "charge.success") {
      const reference = payload.data.reference;
      const orderId = payload.data.metadata?.order_id;
      const amount = payload.data.amount / 100;

      if (orderId) {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single();

        if (order && order.status === "pending") {
          await supabaseAdmin
            .from("orders")
            .update({ status: "processing" })
            .eq("id", orderId);

          await supabaseAdmin.from("payments").insert({
            order_id: orderId,
            amount,
            status: "succeeded",
            transaction_ref: reference,
          });

          console.log(`[Paystack Webhook] Confirmed payment for order ${orderId} ref ${reference}`);
        }
      }
    }

    return { received: true };
  });

export const getUserOrders = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { userId } = data;
      if (!userId) return [];

      const { data: orders, error } = await supabaseAdmin
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              image_url,
              traders (
                id,
                shop_name
              )
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user orders via server function:", error);
        return [];
      }

      return orders ?? [];
    } catch (err) {
      console.error("Catastrophic error in getUserOrders:", err);
      return [];
    }
  });


