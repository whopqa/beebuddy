import { describe, expect, it } from "vitest";
import { PaymentStatus } from "@prisma/client";
import { createWebhookSignature, mapPayOSPaymentStatus, verifyWebhookSignature } from "../src/modules/payments/payments.service";
import { createPaymentRequestSignature } from "../src/modules/payments/payos.client";

describe("PayOS webhook signature", () => {
  const key = "local-checksum-key";
  const data = {
    orderCode: 123456,
    amount: 49000,
    reference: "TXN-001",
  };

  it("accepts an unchanged signed payload", () => {
    const signature = createWebhookSignature(data, key);
    expect(verifyWebhookSignature(data, signature, key)).toBe(true);
  });

  it("rejects a modified amount", () => {
    const signature = createWebhookSignature(data, key);
    expect(verifyWebhookSignature({ ...data, amount: 1 }, signature, key)).toBe(false);
  });

  it("matches the official PayOS webhook signature example", () => {
    const officialChecksumKey = "1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675";
    const officialData = {
      orderCode: 123,
      amount: 3000,
      description: "VQRIO123",
      accountNumber: "12345678",
      reference: "TF230204212323",
      transactionDateTime: "2023-02-04 18:25:00",
      currency: "VND",
      paymentLinkId: "124c33293c43417ab7879e14c8d9eb18",
      code: "00",
      desc: "Thành công",
      counterAccountBankId: "",
      counterAccountBankName: "",
      counterAccountName: "",
      counterAccountNumber: "",
      virtualAccountName: "",
      virtualAccountNumber: "",
    };

    expect(createWebhookSignature(officialData, officialChecksumKey)).toBe(
      "412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03"
    );
  });

  it("creates the canonical signature required when opening a PayOS payment link", () => {
    expect(createPaymentRequestSignature({
      amount: 50000,
      cancelUrl: "http://localhost:3000/billing?status=cancelled",
      description: "BEEBUDDY VIP 123456789",
      orderCode: 123456789,
      returnUrl: "http://localhost:3000/billing?status=success",
    }, "test-checksum-key")).toBe("ba045d2380dfb3c7c43d63aaa28555fc6279d700786699baf7bb600735335b37");
  });

  it("maps PayOS terminal states to BeeBuddy payment states", () => {
    expect(mapPayOSPaymentStatus("PAID")).toBe(PaymentStatus.COMPLETED);
    expect(mapPayOSPaymentStatus("CANCELLED")).toBe(PaymentStatus.CANCELLED);
    expect(mapPayOSPaymentStatus("EXPIRED")).toBe(PaymentStatus.EXPIRED);
    expect(mapPayOSPaymentStatus("PROCESSING")).toBe(PaymentStatus.PENDING);
  });
});
