import type { UserStatus } from '@/constants/roles';

export interface AuthUser {
  id: string;
  email: string;
  /** Role key from the API (e.g. ACCOUNT_MANAGER, SUPER_ADMIN). */
  role: string;
  status: UserStatus;
  profileCompleted: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}
