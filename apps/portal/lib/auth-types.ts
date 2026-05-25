import type { Role, UserStatus } from '@/constants/roles';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  profileCompleted: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}
