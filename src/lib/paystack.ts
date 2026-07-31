import crypto from "node:crypto";

export function isPaystackConfigured(): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY || "";
  return (
    !!key &&
    key.startsWith("sk_") &&
    !key.toLowerCase().includes("your_paystack_secret_key") &&
    !key.toLowerCase().includes("mock") &&
    !key.toLowerCase().includes("placeholder")
  );
}

export function verifyPaystackWebhookSignature(
  bodyText: string,
  signatureHeader: string
): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey || !signatureHeader) return false;

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(bodyText)
    .digest("hex");

  return hash === signatureHeader;
}

export type InitializePaystackInput = {
  email: string;
  amount: number; // in GHS
  callbackUrl: string;
  metadata?: any;
  channels?: string[];
};

export type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type InitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type VerifyData = {
  id: number;
  status: "success" | "failed" | "reversed" | string;
  reference: string;
  amount: number; // in pesewas
  gateway_response: string;
  paid_at: string;
  currency: string;
  channel: string;
  metadata: any;
};

export async function initializePaystackTransaction(
  input: InitializePaystackInput
): Promise<PaystackResponse<InitializeData>> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }

  // Paystack expects amount in Kobo/Pesewas (multiply by 100)
  const amountInPesewas = Math.round(input.amount * 100);

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: amountInPesewas,
      currency: "GHS",
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: input.channels ?? ["card", "mobile_money", "bank_transfer"],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Paystack initialization failed: ${response.statusText} - ${errorBody}`);
  }

  return response.json() as Promise<PaystackResponse<InitializeData>>;
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackResponse<VerifyData>> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY");
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Paystack verification failed: ${response.statusText} - ${errorBody}`);
  }

  return response.json() as Promise<PaystackResponse<VerifyData>>;
}

