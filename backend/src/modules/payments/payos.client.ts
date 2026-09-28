import crypto from "crypto";
import { AppError } from "../../common/errors/app-error";
import { ENV } from "../../config/environment";

const PAYOS_API_URL = "https://api-merchant.payos.vn";
const REQUEST_TIMEOUT_MS = 15_000;

export type PayOSPaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "CANCELLED" | "EXPIRED";

export type PayOSPaymentLink = {
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  description: string;
  orderCode: number;
  currency?: string;
  paymentLinkId: string;
  status: PayOSPaymentStatus;
  checkoutUrl: string;
  qrCode?: string;
};

export type PayOSPaymentLinkInformation = {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  status: PayOSPaymentStatus;
  createdAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  transactions?: Array<{
    reference?: string;
    amount?: number;
    transactionDateTime?: string;
  }>;
};

type PayOSResponse<T> = {
  code: string;
  desc: string;
  data?: T;
  signature?: string;
};

export type CreatePayOSPaymentInput = {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
};

function configuredCredential(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !normalized.startsWith("mock_") && !normalized.startsWith("your_");
}

export function isPayOSConfigured() {
  return configuredCredential(ENV.PAYOS.CLIENT_ID)
    && configuredCredential(ENV.PAYOS.API_KEY)
    && configuredCredential(ENV.PAYOS.CHECKSUM_KEY);
}

export function createPaymentRequestSignature(
  input: Pick<CreatePayOSPaymentInput, "amount" | "cancelUrl" | "description" | "orderCode" | "returnUrl">,
  checksumKey = ENV.PAYOS.CHECKSUM_KEY
) {
  const canonicalData = [
    `amount=${input.amount}`,
    `cancelUrl=${input.cancelUrl}`,
    `description=${input.description}`,
    `orderCode=${input.orderCode}`,
    `returnUrl=${input.returnUrl}`,
  ].join("&");
  return crypto.createHmac("sha256", checksumKey).update(canonicalData).digest("hex");
}

function assertConfigured() {
  if (!isPayOSConfigured()) {
    throw new AppError(
      "PayOS chưa được cấu hình. Hãy điền PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY trong backend/.env",
      503
    );
  }
}

async function requestPayOS<T>(path: string, init: RequestInit = {}) {
  assertConfigured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PAYOS_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-client-id": ENV.PAYOS.CLIENT_ID,
        "x-api-key": ENV.PAYOS.API_KEY,
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => null) as PayOSResponse<T> | null;

    if (!response.ok || !payload || payload.code !== "00" || payload.data === undefined) {
      const providerMessage = payload?.desc?.trim();
      throw new AppError(
        providerMessage ? `PayOS: ${providerMessage}` : `PayOS không phản hồi hợp lệ (HTTP ${response.status})`,
        response.status === 429 ? 429 : 502
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("PayOS phản hồi quá thời gian cho phép", 504);
    }
    throw new AppError("Không thể kết nối tới PayOS", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createPayOSPaymentLink(input: CreatePayOSPaymentInput) {
  const signature = createPaymentRequestSignature(input);
  const response = await requestPayOS<PayOSPaymentLink>("/v2/payment-requests", {
    method: "POST",
    body: JSON.stringify({ ...input, signature }),
  });
  return response.data!;
}

export async function getPayOSPaymentLink(id: number | string) {
  const response = await requestPayOS<PayOSPaymentLinkInformation>(
    `/v2/payment-requests/${encodeURIComponent(String(id))}`
  );
  return response.data!;
}

export async function cancelPayOSPaymentLink(id: number | string, cancellationReason: string) {
  const response = await requestPayOS<PayOSPaymentLinkInformation>(
    `/v2/payment-requests/${encodeURIComponent(String(id))}/cancel`,
    { method: "POST", body: JSON.stringify({ cancellationReason }) }
  );
  return response.data!;
}
