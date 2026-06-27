import type { Prisma, User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class UserRepository {
  /**
   * Finds a user by their unique email.
   * @param email User email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  /**
   * Finds a user by their unique mobile number.
   * @param mobile User mobile number
   */
  async findByMobile(mobile: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        mobile,
        deletedAt: null,
      },
    });
  }

  /**
   * Finds a user by either email or mobile number.
   * @param identifier Email address or Mobile number
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { mobile: identifier }],
        deletedAt: null,
      },
    });
  }

  /**
   * Finds a user by their verification token.
   * @param verificationToken Verification token
   */
  async findByToken(verificationToken: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        verificationToken,
        deletedAt: null,
      },
    });
  }

  /**
   * Finds a user by active refresh token.
   * @param refreshToken Refresh token string
   */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        refreshToken,
        deletedAt: null,
      },
    });
  }

  /**
   * Creates a new user record.
   * @param data User create payload
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Updates an existing user record.
   * @param id User UUID
   * @param data User update payload
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Increments login attempts and locks account for 30 minutes if failed attempts reach or exceed 5.
   * @param id User UUID
   */
  async incrementLoginAttempts(id: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    const nextAttempts = user.loginAttempts + 1;
    const lockedUntil =
      nextAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

    return prisma.user.update({
      where: { id },
      data: {
        loginAttempts: nextAttempts,
        lockedUntil,
      },
    });
  }

  /**
   * Resets login attempt counts and unlocks user.
   * @param id User UUID
   */
  async resetLoginAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
