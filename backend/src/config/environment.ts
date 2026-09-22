import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT: {
    SECRET: process.env.JWT_SECRET || "beebuddy_jwt_secret_dev_key",
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "beebuddy_jwt_refresh_dev_key",
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  PAYOS: {
    CLIENT_ID: process.env.PAYOS_CLIENT_ID || "mock_client_id",
    API_KEY: process.env.PAYOS_API_KEY || "mock_api_key",
    CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY || "mock_checksum_key",
    RETURN_URL: process.env.PAYOS_RETURN_URL || "http://localhost:3000/billing?status=success",
    CANCEL_URL: process.env.PAYOS_CANCEL_URL || "http://localhost:3000/billing?status=cancelled",
  },
};
