import type { LeasingCycle, VacatingCase } from '@/lib/types';

export function isActiveEndLeasingCase(vacating: VacatingCase): boolean {
  const status = vacating.apiStatus?.toUpperCase() ?? '';
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

export function isHistoryEndLeasingCase(vacating: VacatingCase): boolean {
  return vacating.apiStatus?.toUpperCase() === 'COMPLETED';
}

/** Onboarding fully done — case belongs in History, not Active. */
export function isCompletedLeasingCycle(cycle: LeasingCycle): boolean {
  if (cycle.onboardingStepId === 'completed') return true;
  // Completed cycles are inactive ONBOARDING rows; tolerate missing onboardingStepId
  // and mixed casing (portfolio Prisma enum vs GET /leasing/cycles/:id).
  return (
    cycle.isActive === false && cycle.lifecycleStep?.toUpperCase() === 'ONBOARDING'
  );
}

/** Withdrawn letting — belongs in Deleted history, not New leasing. */
export function isCancelledLeasingCycle(cycle: LeasingCycle): boolean {
  if (isCompletedLeasingCycle(cycle)) return false;
  return cycle.isActive === false;
}

/**
 * Split letting cycles into active (in-flight) vs history (completed onboarding).
 * A lone completed cycle must still land in history — not stay under New leasing.
 */
export function splitLeasingCyclesByHistory(cycles: LeasingCycle[]): {
  active: LeasingCycle[];
  history: LeasingCycle[];
} {
  const active: LeasingCycle[] = [];
  const history: LeasingCycle[] = [];

  for (const cycle of cycles) {
    if (isCancelledLeasingCycle(cycle)) continue;
    if (isCompletedLeasingCycle(cycle)) {
      history.push(cycle);
    } else {
      active.push(cycle);
    }
  }

  const byNewest = (a: LeasingCycle, b: LeasingCycle) => {
    const aTime = Date.parse(a.createdAt ?? a.availableFrom ?? '') || 0;
    const bTime = Date.parse(b.createdAt ?? b.availableFrom ?? '') || 0;
    return bTime - aTime;
  };

  return {
    active: active.sort(byNewest),
    history: history.sort(byNewest),
  };
}

export function activeVacatingCasesForProperty(vacatingCases: VacatingCase[]): VacatingCase[] {
  return vacatingCases.filter(isActiveEndLeasingCase);
}

export function historyVacatingCasesForProperty(vacatingCases: VacatingCase[]): VacatingCase[] {
  return vacatingCases.filter(isHistoryEndLeasingCase);
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isVacateDateOnOrAfterToday(vacateDay: string): boolean {
  const parsed = Date.parse(`${vacateDay.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed)) return false;
  return parsed >= startOfTodayMs();
}

/** Tenant tile hint when end-leasing is complete but vacate date has not passed. */
export type TenantVacatingOnHint = {
  label: string;
  caseId: string;
};

function findLatestCompletedVacatingCase(
  vacatingCases: VacatingCase[],
): VacatingCase | undefined {
  return vacatingCases
    .filter((c) => c.apiStatus?.toUpperCase() === 'COMPLETED')
    .sort(
      (a, b) =>
        (Date.parse(b.vacateDate ?? '') || 0) - (Date.parse(a.vacateDate ?? '') || 0),
    )[0];
}

export function resolveTenantVacatingOnHint(args: {
  vacatingCases: VacatingCase[];
  vacateDate?: string | null;
  tenantName?: string | null;
  isVacant?: boolean;
  viewingArchivedTenant?: boolean;
  formatDate: (value: string) => string;
}): TenantVacatingOnHint | null {
  if (args.viewingArchivedTenant || args.isVacant) return null;

  const name = args.tenantName?.trim();
  if (!name || name.toLowerCase() === 'vacant') return null;

  const completedCase = findLatestCompletedVacatingCase(args.vacatingCases);
  if (!completedCase) return null;

  const vacateDay =
    args.vacateDate?.trim().slice(0, 10) ??
    completedCase.vacateDate?.trim().slice(0, 10) ??
    '';
  if (!vacateDay || !isVacateDateOnOrAfterToday(vacateDay)) return null;

  return {
    label: `(Vacating on ${args.formatDate(vacateDay)})`,
    caseId: completedCase.id,
  };
}

/** @deprecated Use resolveTenantVacatingOnHint */
export function resolveTenantVacatingOnLabel(args: {
  vacatingCases: VacatingCase[];
  vacateDate?: string | null;
  tenantName?: string | null;
  isVacant?: boolean;
  viewingArchivedTenant?: boolean;
  formatDate: (value: string) => string;
}): string | null {
  return resolveTenantVacatingOnHint(args)?.label ?? null;
}
