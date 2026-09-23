import { describe, expect, it } from "vitest";
import { createWebhookSignature, verifyWebhookSignature } from "../src/modules/payments/payments.service";

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
});
