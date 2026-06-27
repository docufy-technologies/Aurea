import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ApiErrorResponse } from "@aurea/shared";

/**
 * Express middleware to validate request body using a Zod schema.
 * Rejects with a formatted Aurea validation error response on failure.
 * @param schema Zod schema to validate against
 */
export function validateBody(schema: ZodSchema) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid form submission",
            details: details as any,
          },
        };

        res.status(400).json(response);
        return;
      }

      next(error);
    }
  };
}
