import { Router } from "express";
import { z } from "zod";
import { AuthController } from "../controllers/auth-controller";
import { validateBody } from "../middleware/validation";
import { rateLimiter } from "../middleware/rate-limiter";
import { loginIpRateLimiter } from "../middleware/rate-limit";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async";

const authRouter: Router = Router();
const authController = new AuthController();

// 1. Zod validation schemas
const RegisterSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(2, "Name must be at least 2 characters long"),
  mobile: z
    .string({ required_error: "Mobile number is required" })
    .regex(
      /^\+8801[3-9]\d{8}$/,
      "Mobile number must be in Bangladesh format (+8801XXXXXXXXX)",
    ),
});

const ConfirmEmailSchema = z.object({
  token: z
    .string({ required_error: "Verification token is required" })
    .uuid("Token must be a valid UUID"),
});

const ResendConfirmationSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
});

const LoginSchema = z.object({
  identifier: z
    .string({ required_error: "Email or mobile number is required" })
    .min(1, "Email or mobile number is required"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// 2. Auth Routes
// Registration: 10 requests per minute
authRouter.post(
  "/register",
  rateLimiter(60 * 1000, 10),
  validateBody(RegisterSchema),
  asyncHandler(authController.register),
);

// Email Confirmation
authRouter.post(
  "/confirm-email",
  validateBody(ConfirmEmailSchema),
  asyncHandler(authController.confirmEmail),
);

// Resend Confirmation: 5 requests per minute
authRouter.post(
  "/resend-confirmation",
  rateLimiter(60 * 1000, 5),
  validateBody(ResendConfirmationSchema),
  asyncHandler(authController.resendConfirmation),
);

// Customer Login: Checked by failed IP attempts lockout
authRouter.post(
  "/login",
  loginIpRateLimiter,
  validateBody(LoginSchema),
  asyncHandler(authController.login),
);

// Session Silent Refresh
authRouter.post("/refresh", asyncHandler(authController.refresh));

// Customer Logout
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));

// Get Profile Context
authRouter.get("/me", requireAuth, asyncHandler(authController.getMe));

export default authRouter;
