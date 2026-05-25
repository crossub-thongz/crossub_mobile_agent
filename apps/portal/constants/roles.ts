export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR: 'HR',
  STAFF: 'STAFF',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  PENDING_INVITE: 'PENDING_INVITE',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
