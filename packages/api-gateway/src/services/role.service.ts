import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roles } from '../db/schema/roles';
import { logger } from '../utils/logger.utils';
import { UserRole } from '@monorepo/shared';

export class RoleService {
  static async findRoleByName(roleName: UserRole) {
    try {
      const role = await db.query.roles.findFirst({
        where: eq(roles.name, roleName),
      });
      return role;
    } catch (error) {
      logger.error('Error finding role by name:', error);
      throw error;
    }
  }
}
