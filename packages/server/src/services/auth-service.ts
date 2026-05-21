import crypto from 'crypto';
import { UserRepository } from '../repositories/user-repository';
import { EmailService } from './email-service';
import { hashPassword, comparePassword } from '../utils/passwords';
import { AppError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RegisterInput, UserDto, LoginInput } from '@aurea/shared';

export class AuthService {
  private userRepository = new UserRepository();
  private emailService = new EmailService();

  /**
   * Registers a new unverified customer account.
   * @param input Customer registration data
   */
  async register(input: RegisterInput): Promise<UserDto> {
    const existingEmail = await this.userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError(400, 'EMAIL_ALREADY_EXISTS', 'A user with this email address already exists.');
    }

    const existingMobile = await this.userRepository.findByMobile(input.mobile);
    if (existingMobile) {
      throw new AppError(400, 'MOBILE_ALREADY_EXISTS', 'A user with this mobile number already exists.');
    }

    if (!input.password) {
      throw new AppError(400, 'PASSWORD_REQUIRED', 'Password is required.');
    }
    const passwordHash = await hashPassword(input.password);

    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

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

    this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken)
      .catch((err) => console.error('[AuthService] Failed to send verification email:', err));

    return this.sanitizeUser(user);
  }

  /**
   * Confirms a user's email using a verification token.
   */
  async confirmEmail(token: string): Promise<string> {
    const user = await this.userRepository.findByToken(token);
    if (!user || !user.verificationToken) {
      throw new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid or has already been used.');
    }

    if (user.verificationExpires && new Date() > user.verificationExpires) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired. Please request a new one.');
    }

    await this.userRepository.update(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationExpires: null
    });

    return 'Your account has been successfully verified.';
  }

  /**
   * Resends confirmation email with a fresh verification token.
   */
  async resendConfirmation(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No account associated with this email address was found.');
    }

    if (user.isVerified) {
      throw new AppError(400, 'ALREADY_VERIFIED', 'This account has already been verified.');
    }

    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    await this.userRepository.update(user.id, {
      verificationToken,
      verificationExpires
    });

    this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken)
      .catch((err) => console.error('[AuthService] Failed to send verification email:', err));

    return 'Verification email has been resent. Please check your inbox.';
  }

  /**
   * Authenticates a user and starts a session.
   * @param input Credentials payload
   */
  async login(input: LoginInput): Promise<{ user: UserDto; accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Look up user by identifier (email or mobile)
    const user = await this.userRepository.findByIdentifier(input.identifier);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/mobile or password.');
    }

    // 2. Check if account is locked out
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AppError(429, 'ACCOUNT_LOCKED', `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`, {
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // 3. Verify password
    if (!input.password) {
      throw new AppError(400, 'PASSWORD_REQUIRED', 'Password is required.');
    }
    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Record failed attempt
      await this.userRepository.incrementLoginAttempts(user.id);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/mobile or password.');
    }

    // 4. Force email confirmation verification
    if (!user.isVerified) {
      throw new AppError(403, 'UNVERIFIED_ACCOUNT', 'Your account is unverified. Please confirm your email before signing in.');
    }

    // 5. Success! Reset failure count and record last login timestamp
    await this.userRepository.resetLoginAttempts(user.id);
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // 6. Generate access & refresh tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    
    const rememberMe = !!input.rememberMe;
    const refreshToken = generateRefreshToken(payload, rememberMe);
    
    // 7. Persist refresh token securely in database
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + (rememberMe ? 30 : 1)); // 30 days or 24 hours
    
    await this.userRepository.update(user.id, {
      refreshToken,
      refreshExpires
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 1800 // 30 minutes in seconds
    };
  }

  /**
   * Refreshes access token and rotates refresh token.
   * @param oldRefreshToken Received refresh token
   */
  async refresh(oldRefreshToken: string): Promise<{ user: UserDto; accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Verify token format and cryptography
    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (err) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }

    // 2. Fetch user and match exact active token in database
    const user = await this.userRepository.findByRefreshToken(oldRefreshToken);
    if (!user || !user.refreshToken) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Active session not found. Please sign in again.');
    }

    // 3. Double check database expiration dates
    if (user.refreshExpires && new Date() > user.refreshExpires) {
      // Invalidate token
      await this.userRepository.update(user.id, { refreshToken: null, refreshExpires: null });
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }

    // 4. Determine rememberMe based on duration left on original token (if > 24 hours, it was 30 days)
    const isRememberMe = user.refreshExpires 
      ? (user.refreshExpires.getTime() - Date.now()) > 24 * 60 * 60 * 1000 
      : false;

    // 5. Generate rotated tokens
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload, isRememberMe);

    // 6. Update database record
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + (isRememberMe ? 30 : 1));

    await this.userRepository.update(user.id, {
      refreshToken,
      refreshExpires
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 1800
    };
  }

  /**
   * Invalidates a user's session.
   * @param userId User UUID
   */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: null,
      refreshExpires: null
    });
  }

  /**
   * Fetches the user by their ID and sanitizes the output.
   * @param id User UUID
   */
  async getMe(id: string): Promise<UserDto> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Profile not found.');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Maps a Prisma User entity into a clean User DTO returned to the public client.
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
import { prisma } from '../lib/prisma';
