import { HttpError } from "../../utils/httpError";
import type { ProductAnalysisResult } from "../../services/productAnalysis/types";
import { shopifyGetProductJson, shopifyGetProductsJson, shopifyPutProductJson } from "./shopify.client";
import type { NormalizedProduct, ShopifyProductRest } from "./types";

const DEFAULT_LIST_LIMIT = 15;

/** Strip HTML tags and collapse whitespace for analysis input. */
export function stripHtmlToText(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

function normalizeProduct(raw: ShopifyProductRest): NormalizedProduct {
  const title = (raw.title ?? "").trim() || "Untitled product";
  const body = stripHtmlToText(raw.body_html ?? "");
  const description = body || "No description provided.";
  return {
    id: String(raw.id),
    title,
    description,
  };
}

/**
 * Fetches products from Shopify and returns a normalized, size-limited list.
 */
export async function getProducts(limit: number = DEFAULT_LIST_LIMIT): Promise<NormalizedProduct[]> {
  const json = await shopifyGetProductsJson(limit);
  const list = json.products ?? [];
  if (!list.length) {
    return [];
  }
  return list.map(normalizeProduct);
}

export async function getProductById(productId: string): Promise<NormalizedProduct> {
  if (!productId.trim()) {
    throw new HttpError(400, "Product id is required.");
  }
  const json = await shopifyGetProductJson(productId);
  const raw = json.product;
  if (!raw?.id) {
    throw new HttpError(502, "Unexpected Shopify response: missing product.");
  }
  return normalizeProduct(raw);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MAX_TITLE_LEN = 255;
const MAX_BODY_HTML_LEN = 50_000;

function buildBodyHtmlFromImprovements(improvements: ProductAnalysisResult["improvements"]): string {
  const blocks: string[] = [];

  blocks.push(`<p>${escapeHtml(improvements.useCase)}</p>`);

  if (improvements.benefits.length) {
    blocks.push("<ul>");
    for (const b of improvements.benefits) {
      blocks.push(`<li>${escapeHtml(b)}</li>`);
    }
    blocks.push("</ul>");
  }

  blocks.push(
    `<p><strong>Category:</strong> ${escapeHtml(improvements.category)} · <strong>Audience:</strong> ${escapeHtml(
      improvements.targetAudience,
    )}</p>`,
  );

  if (improvements.keyAttributes.length) {
    blocks.push("<p><strong>Details</strong></p><ul>");
    for (const a of improvements.keyAttributes) {
      blocks.push(`<li><strong>${escapeHtml(a.name)}:</strong> ${escapeHtml(a.value)}</li>`);
    }
    blocks.push("</ul>");
  }

  return blocks.join("\n");
}

function validateShopifyProductPayload(title: string, bodyHtml: string) {
  if (!title.trim()) {
    throw new HttpError(400, "Improvements title is empty; cannot update Shopify.");
  }
  if (title.length > MAX_TITLE_LEN) {
    throw new HttpError(400, `Title exceeds Shopify limit (${MAX_TITLE_LEN} characters).`);
  }
  if (bodyHtml.length > MAX_BODY_HTML_LEN) {
    throw new HttpError(400, `Description HTML exceeds safe limit (${MAX_BODY_HTML_LEN} characters).`);
  }
}

export type UpdateProductResult = {
  id: string;
  title: string;
  bodyHtmlLength: number;
};

/**
 * Updates a Shopify product title and description (body_html) from structured improvements.
 */
export async function updateProductWithImprovements(
  productId: string,
  improvements: ProductAnalysisResult["improvements"],
): Promise<UpdateProductResult> {
  const title = improvements.title.trim();
  const body_html = buildBodyHtmlFromImprovements(improvements);
  validateShopifyProductPayload(title, body_html);

  const envelope = await shopifyPutProductJson(productId, { title, body_html });
  const p = envelope.product;
  if (!p?.id) {
    throw new HttpError(502, "Shopify update succeeded but response was unexpected.");
  }

  return {
    id: String(p.id),
    title: p.title ?? title,
    bodyHtmlLength: body_html.length,
  };
}
