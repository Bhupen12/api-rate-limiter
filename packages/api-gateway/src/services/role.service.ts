import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roles } from '../db/schema/roles';
import { logger } from '../utils/logger.utils';

export class RoleService {
  static async findRoleByName(roleName: string) {
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
