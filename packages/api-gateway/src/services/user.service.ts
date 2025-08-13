import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema/users';
import { roles } from '../db/schema/roles';

export class UserService {
  static async findByEmail(email: string) {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        passwordHash: users.passwordHash,
        roleId: users.roleId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isActive: users.isActive,
        role: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  }

  static async createUser(data: {
    email: string;
    username: string;
    password: string;
    roleId: string;
  }) {
    const hash = await bcrypt.hash(data.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        passwordHash: hash,
        roleId: data.roleId,
      })
      .returning();
    return user;
  }

  static async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }
}
