import { HttpError } from "../utils/httpError";

/**
 * Raw env reads (may be empty). Prefer {@link getShopifyConfig} for validated access.
 */
export const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL ?? "";
export const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? "";

export type ShopifyConfig = {
  /** e.g. my-store.myshopify.com */
  storeHost: string;
  accessToken: string;
  /** https://{storeHost}/admin/api/2023-10 */
  adminApiBaseUrl: string;
};

/**
 * Validates Shopify env and returns normalized config. Throws {@link HttpError} if misconfigured.
 */
export function getShopifyConfig(): ShopifyConfig {
  const rawStore = SHOPIFY_STORE_URL.trim();
  const token = SHOPIFY_ACCESS_TOKEN.trim();

  const missing: string[] = [];
  if (!rawStore) missing.push("SHOPIFY_STORE_URL");
  if (!token) missing.push("SHOPIFY_ACCESS_TOKEN");
  if (missing.length) {
    throw new HttpError(503, `Shopify is not configured. Missing ${missing.join(", ")}.`, {
      missing,
    });
  }

  const storeHost = rawStore.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!storeHost.includes(".")) {
    throw new HttpError(400, "SHOPIFY_STORE_URL must be a valid shop hostname (e.g. your-store.myshopify.com).");
  }
  if (!/\.myshopify\.com$/i.test(storeHost)) {
    throw new HttpError(400, "SHOPIFY_STORE_URL must be the *.myshopify.com hostname (not a custom domain).");
  }

  return {
    storeHost,
    accessToken: token,
    adminApiBaseUrl: `https://${storeHost}/admin/api/2023-10`,
  };
}
