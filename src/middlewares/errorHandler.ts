import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { ZodError } from "zod";
import { env } from "../config/env";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload.",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: "HTTP_ERROR",
        message: err.message,
        details: err.details,
      },
    });
  }

  // Ensure unexpected failures are visible during development/ops.
  // eslint-disable-next-line no-console
  console.error(err);

  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong.",
      ...(env.nodeEnv === "development"
        ? {
            details:
              err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : { value: err },
          }
        : {}),
    },
  });
}

