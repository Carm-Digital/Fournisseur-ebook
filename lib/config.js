function isLocalhostUrl(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return url.includes("localhost") || url.includes("127.0.0.1");
  }
}

export function getRequestOrigin(req) {
  if (!req?.headers) return "";

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return "";

  const hostname = String(host).split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1") return "";

  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function getDomain(req) {
  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin) return requestOrigin;

  const envDomain = process.env.DOMAIN?.replace(/\/$/, "");
  if (envDomain && !isLocalhostUrl(envDomain)) return envDomain;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return envDomain || "http://localhost:4242";
}

export function getApiBase(req) {
  const requestOrigin = getRequestOrigin(req);
  const envApiBase = process.env.API_BASE?.replace(/\/$/, "");

  if (requestOrigin) {
    if (!envApiBase || isLocalhostUrl(envApiBase)) return requestOrigin;
    return envApiBase;
  }

  if (envApiBase && !isLocalhostUrl(envApiBase)) return envApiBase;

  return getDomain(req);
}

export function isProductionEnv(req) {
  const mode = (process.env.STRIPE_MODE || "").trim().toLowerCase();
  if (mode === "live") return true;
  if (mode === "test") return false;
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV === "production") return true;

  const origin = getRequestOrigin(req);
  return Boolean(origin && !isLocalhostUrl(origin));
}

export function getStripeMode(req) {
  return isProductionEnv(req) ? "live" : "test";
}

export const USE_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const PROTECT_DOWNLOADS = process.env.PROTECT_DOWNLOADS !== "false";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Backend uniquement — clé secrète sk_ depuis STRIPE_SECRET_KEY. */
export function getStripeSecretKey(req) {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  const production = isProductionEnv(req);

  if (!key || key.startsWith("sk_test_VOTRE") || key.startsWith("sk_live_VOTRE")) {
    return {
      key: "",
      error: production
        ? "STRIPE_SECRET_KEY manquante. Ajoutez sk_live_... dans Vercel → Production."
        : "STRIPE_SECRET_KEY manquante. Ajoutez sk_test_... ou sk_live_... dans .env.",
    };
  }

  if (key.startsWith("pk_")) {
    return {
      key: "",
      error:
        "STRIPE_SECRET_KEY contient une clé publique (pk_). Utilisez sk_live_... ou sk_test_... (Secret key).",
    };
  }

  if (!key.startsWith("sk_")) {
    return {
      key: "",
      error: "STRIPE_SECRET_KEY invalide : elle doit commencer par sk_.",
    };
  }

  if (production && key.startsWith("sk_test_")) {
    return {
      key: "",
      error:
        "STRIPE_SECRET_KEY est en mode test (sk_test_) en production. Remplacez par sk_live_... sur Vercel.",
    };
  }

  if (!production && key.startsWith("sk_live_")) {
    console.warn("[Stripe] sk_live_ détectée en environnement local — préférez sk_test_ pour le dev.");
  }

  return { key, error: null, mode: key.startsWith("sk_live_") ? "live" : "test" };
}

/** Frontend — clé publique pk_ depuis STRIPE_PUBLISHABLE_KEY (exposée via /api/public-config). */
export function getStripePublishableKey(req) {
  const key = (process.env.STRIPE_PUBLISHABLE_KEY || "").trim();
  const production = isProductionEnv(req);

  if (!key || key.startsWith("pk_test_VOTRE") || key.startsWith("pk_live_VOTRE")) {
    return {
      key: "",
      error: production
        ? "STRIPE_PUBLISHABLE_KEY manquante. Ajoutez pk_live_... dans Vercel → Production."
        : null,
    };
  }

  if (key.startsWith("sk_")) {
    return {
      key: "",
      error:
        "STRIPE_PUBLISHABLE_KEY contient une clé secrète (sk_). Utilisez pk_live_... ou pk_test_... (Publishable key).",
    };
  }

  if (!key.startsWith("pk_")) {
    return {
      key: "",
      error: "STRIPE_PUBLISHABLE_KEY invalide : elle doit commencer par pk_.",
    };
  }

  if (production && key.startsWith("pk_test_")) {
    return {
      key: "",
      error:
        "STRIPE_PUBLISHABLE_KEY est en mode test (pk_test_) en production. Remplacez par pk_live_... sur Vercel.",
    };
  }

  return { key, error: null, mode: key.startsWith("pk_live_") ? "live" : "test" };
}

const _defaultSecret = getStripeSecretKey();
export const STRIPE_SECRET_KEY = _defaultSecret.key;
export const STRIPE_SECRET_KEY_ERROR = _defaultSecret.error;

const _defaultPublishable = getStripePublishableKey();
export const STRIPE_PUBLISHABLE_KEY = _defaultPublishable.key;
export const STRIPE_PUBLISHABLE_KEY_ERROR = _defaultPublishable.error;
