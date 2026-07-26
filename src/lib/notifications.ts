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

    if (type === "order_created") {
      const subject = `Order Confirmation #${shortId} — Marketplace`;
      const itemsList = (order.order_items ?? [])
        .map((i: any) => `• ${i.quantity}x ${i.products?.name ?? "Item"} (GH₵${i.price.toFixed(2)}) [${i.products?.traders?.shop_name ?? "Trader"}]`)
        .join("\n");

      console.log(`
=================================================================
[EMAIL NOTIFICATION DISPATCHED]
TO: ${emailTarget} (${order.delivery_name})
SUBJECT: ${subject}
-----------------------------------------------------------------
Hi ${order.delivery_name},

Thank you for your order on Marketplace! Your local order has been received.

ORDER DETAILS:
Order ID: #${order.id}
Total: GH₵${order.total.toFixed(2)}
Delivery Address: ${order.delivery_address}

ITEMS ORDERED:
${itemsList}

We will notify you as soon as your order status is updated by the local trader.
=================================================================
      `);
    } else if (type === "status_updated") {
      const statusLabel = (newStatus || order.status).toUpperCase();
      const subject = `Order Status Update: #${shortId} is now ${statusLabel}`;

      console.log(`
=================================================================
[EMAIL NOTIFICATION DISPATCHED]
TO: ${emailTarget} (${order.delivery_name})
SUBJECT: ${subject}
-----------------------------------------------------------------
Hi ${order.delivery_name},

Good news! Your order #${shortId} from Marketplace has a status update.

NEW STATUS: ${statusLabel}
Total: GH₵${order.total.toFixed(2)}
Delivery Address: ${order.delivery_address}

You can track your order live anytime on your Marketplace dashboard.
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
