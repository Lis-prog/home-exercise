import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON" },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}
