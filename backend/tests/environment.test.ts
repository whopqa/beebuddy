import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../src/config/environment";

const validEnvironment = {
  NODE_ENV: "production",
  PORT: "5000",
  CLIENT_URL: "https://beebuddy.vn",
  DATABASE_URL: "postgresql://user:password@localhost:5432/beebuddy",
  JWT_SECRET: "a-production-access-secret-with-more-than-32-characters",
  JWT_REFRESH_SECRET: "a-different-refresh-secret-with-more-than-32-characters",
  JWT_EXPIRES_IN: "1d",
  JWT_REFRESH_EXPIRES_IN: "7d",
  EMAIL_DELIVERY_MODE: "smtp",
  EMAIL_FROM: "BeeBuddy <no-reply@beebuddy.vn>",
  SMTP_HOST: "smtp.beebuddy.vn",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "mailer@beebuddy.vn",
  SMTP_PASSWORD: "production-smtp-password",
  PUSH_TOKEN_ENCRYPTION_KEY: "a-distinct-production-push-encryption-secret-key",
  PAYOS_CLIENT_ID: "production-client-id",
  PAYOS_API_KEY: "production-api-key",
  PAYOS_CHECKSUM_KEY: "production-checksum-key",
  PAYOS_RETURN_URL: "https://beebuddy.vn/billing?status=success",
  PAYOS_CANCEL_URL: "https://beebuddy.vn/billing?status=cancelled",
};

describe("parseEnvironment", () => {
  it("accepts a complete production environment", () => {
    const environment = parseEnvironment(validEnvironment);
    expect(environment.NODE_ENV).toBe("production");
    expect(environment.EMAIL.SMTP_SECURE).toBe(false);
  });

  it("accepts Resend in production without SMTP credentials", () => {
    const environment = parseEnvironment({
      ...validEnvironment,
      EMAIL_DELIVERY_MODE: "resend",
      EMAIL_FROM: "BeeBuddy <onboarding@resend.dev>",
      RESEND_API_KEY: "re_production_test_key",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
    });
    expect(environment.EMAIL.DELIVERY_MODE).toBe("resend");
    expect(environment.EMAIL.RESEND_API_KEY).toBe("re_production_test_key");
  });

  it("rejects Resend in production without an API key", () => {
    expect(() => parseEnvironment({
      ...validEnvironment,
      EMAIL_DELIVERY_MODE: "resend",
      RESEND_API_KEY: "",
    })).toThrow(/RESEND_API_KEY/);
  });

  it("rejects the local-only sender when using Resend", () => {
    expect(() => parseEnvironment({
      ...validEnvironment,
      EMAIL_DELIVERY_MODE: "resend",
      RESEND_API_KEY: "re_production_test_key",
      EMAIL_FROM: "BeeBuddy <no-reply@beebuddy.local>",
    })).toThrow(/EMAIL_FROM/);
  });

  it("rejects mock credentials in production", () => {
    expect(() => parseEnvironment({
      ...validEnvironment,
      PAYOS_CHECKSUM_KEY: "mock_checksum_key",
    })).toThrow(/PAYOS_CHECKSUM_KEY/);
  });

  it("rejects identical JWT secrets", () => {
    expect(() => parseEnvironment({
      ...validEnvironment,
      JWT_REFRESH_SECRET: validEnvironment.JWT_SECRET,
    })).toThrow(/phải khác nhau/);
  });

  it("accepts a short demo expiry and rejects an indefinite bypass", () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(parseEnvironment({
      ...validEnvironment,
      DEMO_SKIP_EMAIL_VERIFICATION_UNTIL: until,
    }).DEMO_SKIP_EMAIL_VERIFICATION_UNTIL?.toISOString()).toBe(until);
    expect(() => parseEnvironment({
      ...validEnvironment,
      DEMO_SKIP_EMAIL_VERIFICATION_UNTIL: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    })).toThrow(/7 ngày/);
    expect(() => parseEnvironment({
      ...validEnvironment,
      DEMO_SKIP_EMAIL_VERIFICATION_UNTIL: "2026-10-03T00:00:00",
    })).toThrow(/múi giờ/);
  });
});
