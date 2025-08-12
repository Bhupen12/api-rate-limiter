import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, type NewUser } from '../db/schema/users';
import { logger } from '../utils/logger.utils';

export class UserService {
  static async findByEmail(email: string) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users?.email, email),
      });
      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async createUser(
    userData: Omit<NewUser, 'passwordHash'> & { password: string }
  ) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await db
        .insert(users)
        .values({
          ...userData,
          passwordHash: hashedPassword,
        })
        .returning();
      return newUser[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async verifyPassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
  }
}
