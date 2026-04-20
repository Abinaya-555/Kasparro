import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { analyzeProduct } from "../services/productAnalysis/productAnalysisService";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
});

export const analyzeProductController = asyncHandler(async (req: Request, res: Response) => {
  const input = schema.parse(req.body);
  const result = await analyzeProduct(input);
  res.status(200).json({ ok: true, ...result });
});

