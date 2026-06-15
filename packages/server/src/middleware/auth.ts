import { Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../utils/jwt";
import { AppError } from "../utils/errors";

// Extends express Request type in standard interfaces
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware enforcing valid JWT authentication on routes.
 */
export function requireAuth(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication token is required.",
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Malformed authentication token.",
      );
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError(
          401,
          "TOKEN_EXPIRED",
          "Your session has expired. Please sign in again.",
        ),
      );
    }
    next(
      new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication failed. Please sign in again.",
      ),
    );
  }
}
