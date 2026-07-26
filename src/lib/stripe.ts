import Stripe from "stripe";

// Retrieve Stripe secret key from environment, defaulting to test key placeholder if not set
const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ||
  process.env.VITE_STRIPE_SECRET_KEY ||
  "sk_test_mock_key_for_dev_environment";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-27" as any,
    });
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return (
    !!process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes("mock")
  );
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
