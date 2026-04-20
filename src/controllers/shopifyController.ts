import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { analyzeProduct } from "../services/productAnalysis/productAnalysisService";
import { getProductById, getProducts, updateProductWithImprovements } from "../integrations/shopify/shopify.service";
import { HttpError } from "../utils/httpError";
import { env } from "../config/env";

function respondShopifyFailure(res: Response, err: unknown, fallbackMessage: string): void {
  if (err instanceof HttpError) {
    const status = err.statusCode;
    const safeStatus = status >= 400 && status <= 599 ? status : 502;
    res.status(safeStatus).json({
      ok: false,
      error: err.message || fallbackMessage,
      ...(env.nodeEnv === "development" ? { details: err.details } : {}),
    });
    return;
  }

  res.status(502).json({
    ok: false,
    error: fallbackMessage,
    ...(env.nodeEnv === "development"
      ? {
          details:
            err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { value: err },
        }
      : {}),
  });
}

const improvementsSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  targetAudience: z.string().min(1),
  keyAttributes: z.array(z.object({ name: z.string(), value: z.string() })),
  benefits: z.array(z.string()),
  useCase: z.string().min(1),
});

export const getShopifyProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const safeLimit =
    limit !== undefined && Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : undefined;

  try {
    const products = await getProducts(safeLimit ?? 15);
    res.status(200).json({ ok: true, products });
  } catch (e) {
    respondShopifyFailure(res, e, "Failed to fetch Shopify products.");
    return;
  }
});

export const analyzeShopifyProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id?.trim()) {
    res.status(400).json({ ok: false, error: "Product id is required." });
    return;
  }

  let product;
  try {
    product = await getProductById(id);
  } catch (e) {
    respondShopifyFailure(res, e, "Failed to fetch Shopify product for analysis.");
    return;
  }

  const result = await analyzeProduct({
    title: product.title,
    description: product.description,
  });

  res.status(200).json({
    ok: true,
    shopify: { productId: product.id },
    ...result,
  });
});

const putBodySchema = z.object({
  improvements: improvementsSchema,
});

export const putShopifyProductImprovements = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id?.trim()) {
    res.status(400).json({ ok: false, error: "Product id is required." });
    return;
  }

  const parsed = putBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid improvements payload.", details: parsed.error.flatten() });
    return;
  }

  try {
    const updated = await updateProductWithImprovements(id, parsed.data.improvements);
    res.status(200).json({
      ok: true,
      message: "Product updated in Shopify.",
      product: updated,
    });
  } catch (e) {
    respondShopifyFailure(res, e, "Failed to update Shopify product.");
    return;
  }
});
