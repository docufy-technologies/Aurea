import crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { EmailService } from './email-service';
import { hashPassword } from '../utils/passwords';
import { AppError } from '../utils/errors';
import { RegisterInput, UserDto } from '@aurea/shared';

export class AuthService {
  private userRepository = new UserRepository();
  private emailService = new EmailService();

  /**
   * Registers a new unverified customer account.
   * @param input Customer registration data
   */
  async register(input: RegisterInput): Promise<UserDto> {
    // 1. Check email uniqueness
    const existingEmail = await this.userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError(400, 'EMAIL_ALREADY_EXISTS', 'A user with this email address already exists.');
    }

    // 2. Check mobile uniqueness
    const existingMobile = await this.userRepository.findByMobile(input.mobile);
    if (existingMobile) {
      throw new AppError(400, 'MOBILE_ALREADY_EXISTS', 'A user with this mobile number already exists.');
    }

    // 3. Hash password
    if (!input.password) {
      throw new AppError(400, 'PASSWORD_REQUIRED', 'Password is required.');
    }
    const passwordHash = await hashPassword(input.password);

    // 4. Generate verification token (expires in 24 hours)
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // 5. Persist user record
    const user = await this.userRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      mobile: input.mobile,
      isVerified: false,
      verificationToken,
      verificationExpires,
      role: 'CUSTOMER'
    });

    // 6. Queue/send verification email asynchronously (non-blocking)
    this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken)
      .catch((err) => console.error('[AuthService] Failed to send verification email:', err));

    // 7. Return sanitized User DTO
    return this.sanitizeUser(user);
  }

  /**
   * Confirms a user's email using a verification token.
   * @param token Verification token UUID
   */
  async confirmEmail(token: string): Promise<string> {
    // 1. Look up user by verification token
    const user = await this.userRepository.findByToken(token);
    if (!user || !user.verificationToken) {
      throw new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid or has already been used.');
    }

    // 2. Validate token expiry
    if (user.verificationExpires && new Date() > user.verificationExpires) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired. Please request a new one.');
    }

    // 3. Mark user as verified, clear token columns
    await this.userRepository.update(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationExpires: null
    });

    return 'Your account has been successfully verified.';
  }

  /**
   * Resends confirmation email with a fresh verification token.
   * @param email Target user email
   */
  async resendConfirmation(email: string): Promise<string> {
    // 1. Look up user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No account associated with this email address was found.');
    }

    // 2. Check if already verified
    if (user.isVerified) {
      throw new AppError(400, 'ALREADY_VERIFIED', 'This account has already been verified.');
    }

    // 3. Generate new verification token
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // 4. Save new token parameters
    await this.userRepository.update(user.id, {
      verificationToken,
      verificationExpires
    });

    // 5. Trigger email sending
    this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken)
      .catch((err) => console.error('[AuthService] Failed to send verification email:', err));

    return 'Verification email has been resent. Please check your inbox.';
  }

  /**
   * Maps a Prisma User entity into a clean User DTO returned to the public client.
   * @param user Raw User database entity
   */
  private sanitizeUser(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }
}
