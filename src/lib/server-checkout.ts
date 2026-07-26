import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CheckoutSessionInput = {
  orderId: string;
  items: Array<{
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
    const { orderId, items, deliveryFee = 0 } = data;

    if (!orderId || !items || items.length === 0) {
      throw new Error("Missing required orderId or items");
    }

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: "Local Delivery Fee",
            images: [],
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    if (isStripeConfigured()) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/orders?success=true&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
        cancel_url: `${origin}/cart?canceled=true`,
        metadata: {
          order_id: orderId,
        },
      });

      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", orderId);

      return { url: session.url, sessionId: session.id, mock: false };
    } else {
      const mockSessionId = `cs_test_dev_${Date.now()}`;

      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: mockSessionId })
        .eq("id", orderId);

      const mockSuccessUrl = `${origin}/orders?success=true&session_id=${mockSessionId}&order_id=${orderId}&mock=true`;

      return { url: mockSuccessUrl, sessionId: mockSessionId, mock: true };
    }
  });

export const processWebhookPayload = createServerFn({ method: "POST" })
  .validator((data: { type: string; data: { object: any } }) => data)
  .handler(async ({ data }) => {
    const event = data;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;
      const sessionId = session.id;

      let targetOrderId = orderId;

      if (!targetOrderId && sessionId) {
        const { data: existingOrder } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .single();

        if (existingOrder) {
          targetOrderId = existingOrder.id;
        }
      }

      if (targetOrderId) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "processing" })
          .eq("id", targetOrderId);

        const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
        await supabaseAdmin.from("payments").insert({
          order_id: targetOrderId,
          amount: totalAmount,
          status: "succeeded",
          transaction_ref: String(session.payment_intent || session.id),
        });

        console.log(`[Stripe Webhook] Order ${targetOrderId} marked as processing & payment recorded.`);
      }
    }

    return { received: true };
  });
