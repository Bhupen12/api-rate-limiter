import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roles } from '../db/schema/roles';
import { UserRole } from '@monorepo/shared';

export class RoleService {
  static async findRoleByName(name: UserRole) {
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
    return role[0] || null;
  }
}
