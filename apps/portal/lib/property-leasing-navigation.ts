import { LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';

export const LEASING_ONBOARDING_BOND_SECTION_ID = 'leasing-onboarding-bond';

export function propertyLeasingBondFocusQuery(): string {
  const params = new URLSearchParams({
    tab: 'Leasing',
    workflow: 'leasing',
    step: LEASING_LIFECYCLE_STEP.ONBOARDING,
    focus: 'bond',
  });
  return params.toString();
}

export function propertyLeasingBondFocusPath(propertyId: string): string {
  return `/properties/${propertyId}?${propertyLeasingBondFocusQuery()}`;
}

export function isPropertyLeasingBondFocus(
  searchParams: Pick<URLSearchParams, 'get'>,
): boolean {
  return (
    searchParams.get('tab') === 'Leasing' &&
    searchParams.get('workflow') === 'leasing' &&
    searchParams.get('step') === LEASING_LIFECYCLE_STEP.ONBOARDING &&
    searchParams.get('focus') === 'bond'
  );
}
