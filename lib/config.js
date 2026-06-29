export function getDomain() {
  const domain = process.env.DOMAIN?.replace(/\/$/, "");
  if (domain) return domain;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:4242";
}

export function getApiBase() {
  return (process.env.API_BASE || getDomain()).replace(/\/$/, "");
}

export const USE_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const PROTECT_DOWNLOADS = process.env.PROTECT_DOWNLOADS !== "false";
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
