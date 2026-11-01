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

export function needsMfaEnrollment(user: { mfaEnrollmentRequired?: boolean }): boolean {
  return Boolean(user.mfaEnrollmentRequired);
}

export function needsMfaChallenge(user: { mfaChallengeRequired?: boolean }): boolean {
  return Boolean(user.mfaChallengeRequired);
}

/**
 * Post-login destination order:
 * 1) System access agreement (if required)
 * 2) Forced password change (temp / first-login password)
 * 3) MFA enrolment, then a verification code when this login requires one
 * 4) Default app route
 */
export function postAuthDestination(
  user: {
    systemAccessAgreementRequired?: boolean;
    systemAccessAccepted?: boolean;
    mustChangePassword?: boolean;
    mustChangePasswordWithoutCurrent?: boolean;
    mfaEnrollmentRequired?: boolean;
    mfaChallengeRequired?: boolean;
  },
  defaultRoute: string,
  agreementRoute: string,
  changePasswordRoute: string = '/change-password',
  mfaSetupRoute: string = '/mfa/setup',
  mfaVerifyRoute: string = '/mfa/verify',
): string {
  if (needsSystemAccessAgreement(user)) return agreementRoute;
  if (needsPasswordChange(user)) return changePasswordRoute;
  if (needsMfaEnrollment(user)) return mfaSetupRoute;
  if (needsMfaChallenge(user)) return mfaVerifyRoute;
  return defaultRoute;
}
