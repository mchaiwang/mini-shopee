// /lib/auth-config.ts

export const AUTH_COOKIE_NAME = "admin_session";

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
export const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Rakchan";
export const ADMIN_ROLE = process.env.ADMIN_ROLE || "ADMIN";
export const ADMIN_SESSION_TOKEN =
  process.env.ADMIN_SESSION_TOKEN || "rakchan_super_secret_session_token_2026";