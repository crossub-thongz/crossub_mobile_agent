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
  // Completed cycles are inactive ONBOARDING rows; tolerate missing onboardingStepId.
  return cycle.isActive === false && cycle.lifecycleStep === 'ONBOARDING';
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
