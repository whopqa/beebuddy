import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_URL: z.string().url("CLIENT_URL phải là một URL hợp lệ").default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải có ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().min(1).default("1d"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET phải có ít nhất 32 ký tự"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  PAYOS_CLIENT_ID: z.string().default(""),
  PAYOS_API_KEY: z.string().default(""),
  PAYOS_CHECKSUM_KEY: z.string().default(""),
  PAYOS_RETURN_URL: z.string().url().default("http://localhost:3000/billing?status=success"),
  PAYOS_CANCEL_URL: z.string().url().default("http://localhost:3000/billing?status=cancelled"),
});

const unsafeProductionValues = new Set([
  "beebuddy_super_secret_jwt_key_2026_change_in_production",
  "beebuddy_refresh_secret_key_2026",
  "mock_client_id",
  "mock_api_key",
  "mock_checksum_key",
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
    PAYOS: {
      CLIENT_ID: value.PAYOS_CLIENT_ID,
      API_KEY: value.PAYOS_API_KEY,
      CHECKSUM_KEY: value.PAYOS_CHECKSUM_KEY,
      RETURN_URL: value.PAYOS_RETURN_URL,
      CANCEL_URL: value.PAYOS_CANCEL_URL,
    },
  };
}

export const ENV = parseEnvironment(process.env);
