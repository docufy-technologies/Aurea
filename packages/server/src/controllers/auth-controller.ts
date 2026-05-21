import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { ApiResponse } from '@aurea/shared';

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
        message: 'Registration successful. Please check your email to verify your account.'
      }
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
        message
      }
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
        message
      }
    };

    res.status(200).json(response);
  };
}
