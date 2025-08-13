import type { DBUser } from '../../db/schema/users';
import type { PublicUserDTO, UserRole } from '@monorepo/shared';

interface DBUserWithRole extends DBUser {
  role?: string | null;
}

export const toPublicUserDTO = (user: DBUserWithRole): PublicUserDTO => ({
  id: user.id,
  email: user.email,
  username: user.username,
  role: (user.role as UserRole) || 'viewer',
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
