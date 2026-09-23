import type { ApiEnvelope } from "./auth-types";

export type SubscriptionPlan = {
  tier: "FREE" | "VIP" | "PRO";
  name: string;
  priceVND: number;
  durationMonths: number;
  features: string[];
};

export async function getSubscriptionPlans() {
  const response = await fetch("/api/payments/plans", { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<SubscriptionPlan[]>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || body.message || "Không thể tải bảng giá");
  }
  return body.data;
}
