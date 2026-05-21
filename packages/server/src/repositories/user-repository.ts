import { prisma } from '../lib/prisma';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  /**
   * Finds a user by their unique email.
   * @param email User email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null
      }
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
        deletedAt: null
      }
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
        deletedAt: null
      }
    });
  }

  /**
   * Creates a new user record.
   * @param data User create payload
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data
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
      data
    });
  }
}
