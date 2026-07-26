export interface SystemAccessAgreementView {
  agreementType: string;
  title: string;
  version: string;
  fileName: string;
  documentPath: string;
}

export function needsSystemAccessAgreement(user: {
  systemAccessAgreementRequired?: boolean;
  systemAccessAccepted?: boolean;
}): boolean {
  return Boolean(user.systemAccessAgreementRequired && !user.systemAccessAccepted);
}

export function needsPasswordChange(user: { mustChangePassword?: boolean }): boolean {
  return Boolean(user.mustChangePassword);
}

export function needsPasswordChangeWithoutCurrent(user: {
  mustChangePasswordWithoutCurrent?: boolean;
}): boolean {
  return Boolean(user.mustChangePasswordWithoutCurrent);
}

/**
 * Post-login destination order:
 * 1) System access agreement (if required)
 * 2) Forced password change (temp / first-login password)
 * 3) Default app route
 */
export function postAuthDestination(
  user: {
    systemAccessAgreementRequired?: boolean;
    systemAccessAccepted?: boolean;
    mustChangePassword?: boolean;
    mustChangePasswordWithoutCurrent?: boolean;
  },
  defaultRoute: string,
  agreementRoute: string,
  changePasswordRoute: string = '/change-password',
): string {
  if (needsSystemAccessAgreement(user)) return agreementRoute;
  if (needsPasswordChange(user)) return changePasswordRoute;
  return defaultRoute;
}
