import { UserRole } from '@monorepo/shared';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  moderator: 2,
  editor: 3,
  admin: 4,
};
