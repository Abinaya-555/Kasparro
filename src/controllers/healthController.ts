import type { Request, Response } from "express";

export function healthCheck(_req: Request, res: Response) {
  res.status(200).json({
    ok: true,
    service: "ai-commerce-readiness-backend",
  });
}

