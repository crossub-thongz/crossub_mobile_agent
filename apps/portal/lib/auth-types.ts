import type { UserStatus } from '@/constants/roles';

export interface AuthUser {
  id: string;
  email: string;
  /** Role key from the API (e.g. ACCOUNT_MANAGER, SUPER_ADMIN). */
  role: string;
  status: UserStatus;
  profileCompleted: boolean;
  systemAccessAgreementRequired?: boolean;
  systemAccessAccepted?: boolean;
  systemAccessAcceptedAt?: string | null;
  systemAccessAgreementVersion?: string | null;
  /** True when the account must set a new password before using the app. */
  mustChangePassword?: boolean;
  /** Sales invite registration — set a new password without the generated temp password. */
  mustChangePasswordWithoutCurrent?: boolean;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}
