import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnvironment = z.preprocess((value) => {
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return value;
}, z.boolean());

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_URL: z.string().url("CLIENT_URL phải là một URL hợp lệ").default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải có ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET phải có ít nhất 32 ký tự"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  EMAIL_DELIVERY_MODE: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().min(3).default("BeeBuddy <no-reply@beebuddy.local>"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: booleanFromEnvironment.default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  AUTH_TOKEN_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(3600).default(60),
  GOOGLE_CLIENT_ID: z.string().default(""),
  MEDIA_UPLOAD_DIR: z.string().min(1).default("uploads"),
  MEDIA_IMAGE_MAX_BYTES: z.coerce.number().int().min(1024).max(20 * 1024 * 1024).default(4 * 1024 * 1024),
  PUSH_TOKEN_ENCRYPTION_KEY: z.string().min(32).default("beebuddy_local_push_token_key_change_me"),
  PAYOS_CLIENT_ID: z.string().default(""),
  PAYOS_API_KEY: z.string().default(""),
  PAYOS_CHECKSUM_KEY: z.string().default(""),
  PAYOS_RETURN_URL: z.string().url().default("http://localhost:3000/billing?status=success"),
  PAYOS_CANCEL_URL: z.string().url().default("http://localhost:3000/billing?status=cancelled"),
  PAYOS_PAYMENT_LINK_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
});

const unsafeProductionValues = new Set([
  "beebuddy_super_secret_jwt_key_2026_change_in_production",
  "beebuddy_refresh_secret_key_2026",
  "mock_client_id",
  "mock_api_key",
  "mock_checksum_key",
  "beebuddy_local_push_token_key_change_me",
]);

export function parseEnvironment(source: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Cấu hình môi trường không hợp lệ: ${details}`);
  }

  const value = parsed.data;
  const errors: string[] = [];

  if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
    errors.push("JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau");
  }

  if (value.NODE_ENV === "production") {
    const productionSecrets = {
      JWT_SECRET: value.JWT_SECRET,
      JWT_REFRESH_SECRET: value.JWT_REFRESH_SECRET,
      PUSH_TOKEN_ENCRYPTION_KEY: value.PUSH_TOKEN_ENCRYPTION_KEY,
      PAYOS_CLIENT_ID: value.PAYOS_CLIENT_ID,
      PAYOS_API_KEY: value.PAYOS_API_KEY,
      PAYOS_CHECKSUM_KEY: value.PAYOS_CHECKSUM_KEY,
    };

    for (const [name, secret] of Object.entries(productionSecrets)) {
      if (!secret || unsafeProductionValues.has(secret) || secret.toLowerCase().startsWith("mock_")) {
        errors.push(`${name} phải được cấu hình bằng giá trị production, không dùng giá trị mẫu`);
      }
    }

    if (!value.CLIENT_URL.startsWith("https://")) {
      errors.push("CLIENT_URL production phải sử dụng HTTPS");
    }
    if (!value.PAYOS_RETURN_URL.startsWith("https://") || !value.PAYOS_CANCEL_URL.startsWith("https://")) {
      errors.push("PAYOS_RETURN_URL và PAYOS_CANCEL_URL production phải sử dụng HTTPS");
    }

    if (value.EMAIL_DELIVERY_MODE !== "smtp") {
      errors.push("EMAIL_DELIVERY_MODE production phải là smtp");
    }
    if (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASSWORD) {
      errors.push("SMTP_HOST, SMTP_USER và SMTP_PASSWORD phải được cấu hình trong production");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Cấu hình môi trường không an toàn: ${errors.join("; ")}`);
  }

  return {
    PORT: value.PORT,
    NODE_ENV: value.NODE_ENV,
    CLIENT_URL: value.CLIENT_URL,
    DATABASE_URL: value.DATABASE_URL,
    JWT: {
      SECRET: value.JWT_SECRET,
      EXPIRES_IN: value.JWT_EXPIRES_IN,
      REFRESH_SECRET: value.JWT_REFRESH_SECRET,
      REFRESH_EXPIRES_IN: value.JWT_REFRESH_EXPIRES_IN,
    },
    EMAIL: {
      DELIVERY_MODE: value.EMAIL_DELIVERY_MODE,
      FROM: value.EMAIL_FROM,
      SMTP_HOST: value.SMTP_HOST,
      SMTP_PORT: value.SMTP_PORT,
      SMTP_SECURE: value.SMTP_SECURE,
      SMTP_USER: value.SMTP_USER,
      SMTP_PASSWORD: value.SMTP_PASSWORD,
      VERIFICATION_TTL_MINUTES: value.EMAIL_VERIFICATION_TTL_MINUTES,
      PASSWORD_RESET_TTL_MINUTES: value.PASSWORD_RESET_TTL_MINUTES,
      RESEND_COOLDOWN_SECONDS: value.AUTH_TOKEN_RESEND_COOLDOWN_SECONDS,
    },
    GOOGLE: {
      CLIENT_ID: value.GOOGLE_CLIENT_ID,
    },
    MEDIA: {
      UPLOAD_DIR: value.MEDIA_UPLOAD_DIR,
      IMAGE_MAX_BYTES: value.MEDIA_IMAGE_MAX_BYTES,
    },
    PUSH_TOKEN_ENCRYPTION_KEY: value.PUSH_TOKEN_ENCRYPTION_KEY,
    PAYOS: {
      CLIENT_ID: value.PAYOS_CLIENT_ID,
      API_KEY: value.PAYOS_API_KEY,
      CHECKSUM_KEY: value.PAYOS_CHECKSUM_KEY,
      RETURN_URL: value.PAYOS_RETURN_URL,
      CANCEL_URL: value.PAYOS_CANCEL_URL,
      PAYMENT_LINK_TTL_MINUTES: value.PAYOS_PAYMENT_LINK_TTL_MINUTES,
    },
  };
}

export const ENV = parseEnvironment(process.env);
