import type { ApiEnvelope } from "./auth-types";

export type SubscriptionPlan = {
  tier: "FREE" | "VIP" | "PRO";
  name: string;
  description?: string | null;
  priceVND: number;
  durationMonths: number;
  version?: number;
  features: Array<{ code: string; name: string; limitValue?: number | null }>;
};

export type Checkout = {
  paymentId: string;
  orderCode: number;
  tier: "VIP" | "PRO";
  amount: number;
  currency: string;
  description: string;
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode?: string;
  expiresAt: string;
  instructions: string;
};

export type PaymentStatus = {
  id: string;
  orderCode: number;
  tier: "VIP" | "PRO";
  amount: string | number;
  currency: string;
  durationMonths: number;
  paymentMethod: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  checkoutUrl?: string | null;
  transactionRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getSubscriptionPlans() {
  const response = await fetch("/api/payments/plans", { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<SubscriptionPlan[]>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || body.message || "Unable to load pricing");
  }
  return body.data;
}

async function authenticatedRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/payments/${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Unable to process the payment");
  }
  return body.data;
}

export const createCheckout = (tier: "VIP" | "PRO", durationMonths = 1) =>
  authenticatedRequest<Checkout>("create-checkout", { method: "POST", body: JSON.stringify({ tier, durationMonths }) });

export const getPaymentStatus = (orderCode: number) =>
  authenticatedRequest<PaymentStatus>(`status/${orderCode}`);

export const cancelCheckout = (orderCode: number) =>
  authenticatedRequest<{ orderCode: number; status: PaymentStatus["status"] }>(`cancel/${orderCode}`, { method: "POST" });

export const getMyPayments = () => authenticatedRequest<PaymentStatus[]>("my-history");
