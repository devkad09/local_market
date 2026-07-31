import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificationPayload = {
  type: "order_created" | "status_updated";
  orderId: string;
  recipientEmail?: string;
  newStatus?: string;
};

export const sendOrderEmailNotification = createServerFn({ method: "POST" })
  .validator((data: NotificationPayload) => data)
  .handler(async ({ data }) => {
    const { type, orderId, recipientEmail, newStatus } = data;

    // Fetch order details
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          quantity,
          price,
          products (
            name,
            traders (shop_name)
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (!order) {
      console.warn(`[Notification] Order ${orderId} not found for email dispatch`);
      return { success: false, error: "Order not found" };
    }

    const emailTarget = recipientEmail || "customer@example.com";
    const shortId = orderId.slice(0, 8);
    const resendApiKey = process.env.RESEND_API_KEY || "";

    let subject = "";
    let htmlContent = "";
    let plainTextContent = "";

    if (type === "order_created") {
      subject = `Order Confirmation #${shortId} — Marketplace`;
      const itemsListText = (order.order_items ?? [])
        .map((i: any) => `• ${i.quantity}x ${i.products?.name ?? "Item"} (GH₵${i.price.toFixed(2)}) [${i.products?.traders?.shop_name ?? "Trader"}]`)
        .join("\n");

      const itemsListHtml = (order.order_items ?? [])
        .map(
          (i: any) =>
            `<li style="margin-bottom:6px;"><strong>${i.quantity}x ${i.products?.name ?? "Item"}</strong> — GH₵${i.price.toFixed(2)} <em>(${i.products?.traders?.shop_name ?? "Local Trader"})</em></li>`
        )
        .join("");

      plainTextContent = `Hi ${order.delivery_name},\n\nThank you for your order on Marketplace! Your local order has been received.\n\nORDER DETAILS:\nOrder ID: #${order.id}\nTotal: GH₵${order.total.toFixed(2)}\nDelivery Address: ${order.delivery_address}\n\nITEMS ORDERED:\n${itemsListText}\n\nWe will notify you as soon as your order status is updated.`;

      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h2 style="color: #ea580c; margin-top: 0;">Marketplace Order Confirmed!</h2>
          <p>Hi <strong>${order.delivery_name}</strong>,</p>
          <p>Thank you for supporting local traders! Your order <strong>#${shortId}</strong> has been received and is being prepared.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin: 0 0 8px 0;"><strong>Total Amount:</strong> GH₵${order.total.toFixed(2)}</p>
            <p style="margin: 0;"><strong>Delivery Address:</strong> ${order.delivery_address}</p>
          </div>
          <h3>Items Ordered</h3>
          <ul>${itemsListHtml}</ul>
          <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">You can view live status updates anytime on your orders page.</p>
        </div>
      `;
    } else if (type === "status_updated") {
      const statusLabel = (newStatus || order.status).toUpperCase();
      subject = `Order Status Update: #${shortId} is now ${statusLabel}`;

      plainTextContent = `Hi ${order.delivery_name},\n\nGood news! Your order #${shortId} status has been updated to: ${statusLabel}.\n\nTotal: GH₵${order.total.toFixed(2)}\nDelivery Address: ${order.delivery_address}\n\nTrack live on Marketplace dashboard.`;

      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h2 style="color: #059669; margin-top: 0;">Order Status Updated</h2>
          <p>Hi <strong>${order.delivery_name}</strong>,</p>
          <p>Your order <strong>#${shortId}</strong> has a new update:</p>
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 15px; border-radius: 8px; margin: 15px 0; font-size: 18px; font-weight: bold; text-align: center;">
            STATUS: ${statusLabel}
          </div>
          <p style="color: #6b7280; font-size: 13px;">Thank you for shopping local!</p>
        </div>
      `;
    }

    // If Resend API key is provided, send email via Resend REST API
    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Marketplace <notifications@resend.dev>",
            to: [emailTarget],
            subject,
            html: htmlContent,
            text: plainTextContent,
          }),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          console.log(`[Resend Email Sent] ID: ${resendData.id} to ${emailTarget}`);
        } else {
          console.error(`[Resend Email Failed] Status ${resendRes.status}: ${await resendRes.text()}`);
        }
      } catch (err: any) {
        console.error(`[Resend Email Error]: ${err?.message}`);
      }
    } else {
      console.log(`
=================================================================
[EMAIL DISPATCH - CONSOLE FALLBACK] (Set RESEND_API_KEY for live delivery)
TO: ${emailTarget} (${order.delivery_name})
SUBJECT: ${subject}
-----------------------------------------------------------------
${plainTextContent}
=================================================================
      `);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      orderId,
      type,
    };
  });
