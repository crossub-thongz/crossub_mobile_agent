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

export function postAuthDestination(
  user: {
    systemAccessAgreementRequired?: boolean;
    systemAccessAccepted?: boolean;
  },
  defaultRoute: string,
  agreementRoute: string,
): string {
  return needsSystemAccessAgreement(user) ? agreementRoute : defaultRoute;
}
