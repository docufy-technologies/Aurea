import { Request, Response } from "express";
import { AuthService } from "../services/auth-service";
import { ApiResponse } from "@aurea/shared";
import {
  recordFailedAttempt,
  clearFailedAttempts,
} from "../middleware/rate-limit";

export class AuthController {
  private authService = new AuthService();

  /**
   * Handler for new customer registration.
   * POST /api/v1/auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    const userDto = await this.authService.register(req.body);

    const response: ApiResponse<{ user: typeof userDto; message: string }> = {
      success: true,
      data: {
        user: userDto,
        message:
          "Registration successful. Please check your email to verify your account.",
      },
    };

    res.status(201).json(response);
  };

  /**
   * Handler for email verification confirmation.
   * POST /api/v1/auth/confirm-email
   */
  confirmEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    const message = await this.authService.confirmEmail(token);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message,
      },
    };

    res.status(200).json(response);
  };

  /**
   * Handler for resending the verification token.
   * POST /api/v1/auth/resend-confirmation
   */
  resendConfirmation = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const message = await this.authService.resendConfirmation(email);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message,
      },
    };

    res.status(200).json(response);
  };

  /**
   * Handler for customer login.
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    try {
      const { identifier, password, rememberMe } = req.body;
      const result = await this.authService.login({
        identifier,
        password,
        rememberMe,
      });

      // Clear IP rate limit tracker on successful login
      clearFailedAttempts(ip);

      // Set HttpOnly refresh token cookie
      const maxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge,
      });

      const response: ApiResponse<{
        user: typeof result.user;
        accessToken: string;
        expiresIn: number;
      }> = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
        },
      };

      res.status(200).json(response);
    } catch (err: any) {
      // Record failed login attempt for the IP rate limiter
      if (err.code === "INVALID_CREDENTIALS") {
        recordFailedAttempt(ip);
      }
      throw err;
    }
  };

  /**
   * Handler for rotating access and refresh tokens.
   * POST /api/v1/auth/refresh
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    // Get old refresh token from request cookies (or body/headers if parsed custom)
    const oldRefreshToken = (req as any).cookies?.refreshToken;
    if (!oldRefreshToken) {
      throw new Error("Refresh token is missing.");
    }

    const result = await this.authService.refresh(oldRefreshToken);

    // Set rotated HttpOnly refresh token cookie
    const isRememberMe = (result.user as any).rememberMe || true; // maintain state
    const maxAge = isRememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
    });

    const response: ApiResponse<{
      user: typeof result.user;
      accessToken: string;
      expiresIn: number;
    }> = {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    };

    res.status(200).json(response);
  };

  /**
   * Handler for user logout.
   * POST /api/v1/auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.userId;
    if (userId) {
      await this.authService.logout(userId);
    }

    // Clear HttpOnly refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: "Logout successful.",
      },
    };

    res.status(200).json(response);
  };

  /**
   * Handler for getting current user context.
   * GET /api/v1/auth/me
   */
  getMe = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await this.authService.getMe(userId);

    const response: ApiResponse<{ user: typeof user }> = {
      success: true,
      data: {
        user,
      },
    };

    res.status(200).json(response);
  };
}
