import { User } from '@monorepo/shared';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'viewer@example.com',
    username: 'viewer',
    role: 'viewer',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    email: 'editor@example.com',
    username: 'editor',
    role: 'editor',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    email: 'moderator@example.com',
    username: 'moderator',
    role: 'moderator',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const MOCK_PASSWORDS: Record<string, string> = {
  'admin@example.com': 'admin123',
  'viewer@example.com': 'viewer123',
  'editor@example.com': 'editor123',
  'moderator@example.com': 'moderator123',
};
