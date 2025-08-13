import { UserRole } from '../common';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type PublicUserDTO = Omit<UserDTO, 'role'> & { role: UserRole };
