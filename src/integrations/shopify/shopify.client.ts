import { getShopifyConfig } from "../../config/shopify";
import { HttpError } from "../../utils/httpError";
import type { ShopifyProductEnvelope, ShopifyProductsListResponse } from "./types";

function buildUrl(path: string): string {
  const { adminApiBaseUrl } = getShopifyConfig();
  // adminApiBaseUrl already ends with /2023-10
  const base = adminApiBaseUrl.endsWith("/") ? adminApiBaseUrl.slice(0, -1) : adminApiBaseUrl;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseJsonSafe(text: string): Promise<unknown> {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getAccessHeaders(): HeadersInit {
  const { accessToken } = getShopifyConfig();
  return {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": accessToken,
  };
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new HttpError(504, `Shopify request timed out after ${timeoutMs}ms.`);
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

function shopifyErrorFromResponse(args: {
  url: string;
  status: number;
  statusText: string;
  requestId?: string | null;
  body: unknown;
  rawText: string;
}) {
  const { url, status, statusText, requestId, body, rawText } = args;

  let message =
    typeof (body as { errors?: unknown } | null)?.errors === "string"
      ? ((body as { errors: string }).errors as string)
      : rawText.slice(0, 800) || statusText;

  // Keep message human-readable for demos.
  message = message.replace(/\s+/g, " ").trim();

  throw new HttpError(status, message || "Shopify API request failed.", {
    url,
    status,
    requestId: requestId ?? undefined,
    body,
  });
}

/**
 * Low-level Shopify Admin REST calls. All network errors map to {@link HttpError}.
 */
export async function shopifyGetProductsJson(limit: number): Promise<ShopifyProductsListResponse> {
  const capped = Math.min(Math.max(limit, 1), 50);
  const url = buildUrl(`/products.json?limit=${capped}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
      method: "GET",
      headers: getAccessHeaders(),
      },
      8_000,
    );
  } catch (e) {
    throw new HttpError(502, "Failed to reach Shopify API.", {
      cause: e instanceof Error ? e.message : String(e),
      url,
    });
  }

  const text = await response.text();
  const body = (await parseJsonSafe(text)) as Record<string, unknown> | null;

  if (!response.ok) {
    shopifyErrorFromResponse({
      url,
      status: response.status,
      statusText: response.statusText,
      requestId: response.headers.get("x-request-id"),
      body,
      rawText: text,
    });
  }

  return (body ?? {}) as ShopifyProductsListResponse;
}

export async function shopifyGetProductJson(productId: string): Promise<ShopifyProductEnvelope> {
  const url = buildUrl(`/products/${encodeURIComponent(productId)}.json`);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: "GET",
      headers: getAccessHeaders(),
    }, DEFAULT_TIMEOUT_MS);
  } catch (e) {
    throw new HttpError(502, "Failed to reach Shopify API.", {
      cause: e instanceof Error ? e.message : String(e),
      url,
    });
  }

  const text = await response.text();
  const body = (await parseJsonSafe(text)) as Record<string, unknown> | null;

  if (!response.ok) {
    if (response.status === 404) {
      throw new HttpError(404, `Shopify product not found: ${productId}`);
    }
    shopifyErrorFromResponse({
      url,
      status: response.status,
      statusText: response.statusText,
      requestId: response.headers.get("x-request-id"),
      body,
      rawText: text,
    });
  }

  return (body ?? {}) as ShopifyProductEnvelope;
}

export async function shopifyPutProductJson(
  productId: string,
  payload: { title: string; body_html: string },
): Promise<ShopifyProductEnvelope> {
  const url = buildUrl(`/products/${encodeURIComponent(productId)}.json`);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: "PUT",
      headers: getAccessHeaders(),
      body: JSON.stringify({
        product: {
          id: Number(productId),
          title: payload.title,
          body_html: payload.body_html,
        },
      }),
    }, DEFAULT_TIMEOUT_MS);
  } catch (e) {
    throw new HttpError(502, "Failed to reach Shopify API.", {
      cause: e instanceof Error ? e.message : String(e),
      url,
    });
  }

  const text = await response.text();
  const body = (await parseJsonSafe(text)) as Record<string, unknown> | null;

  if (!response.ok) {
    shopifyErrorFromResponse({
      url,
      status: response.status,
      statusText: response.statusText,
      requestId: response.headers.get("x-request-id"),
      body,
      rawText: text,
    });
  }

  return (body ?? {}) as ShopifyProductEnvelope;
}
