import type { LeasingCycle, VacatingCase } from '@/lib/types';

export function isActiveEndLeasingCase(vacating: VacatingCase): boolean {
  const status = vacating.apiStatus?.toUpperCase() ?? '';
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

export function isHistoryEndLeasingCase(vacating: VacatingCase): boolean {
  return vacating.apiStatus?.toUpperCase() === 'COMPLETED';
}

/** Past letting cycles — keep the newest in-flight cycle active; older rows are history. */
export function splitLeasingCyclesByHistory(cycles: LeasingCycle[]): {
  active: LeasingCycle[];
  history: LeasingCycle[];
} {
  if (cycles.length <= 1) {
    return { active: cycles, history: [] };
  }
  const sorted = [...cycles].sort((a, b) => {
    const aTime = Date.parse(a.createdAt ?? a.availableFrom ?? '') || 0;
    const bTime = Date.parse(b.createdAt ?? b.availableFrom ?? '') || 0;
    return bTime - aTime;
  });
  return {
    active: sorted.slice(0, 1),
    history: sorted.slice(1),
  };
}

export function activeVacatingCasesForProperty(vacatingCases: VacatingCase[]): VacatingCase[] {
  return vacatingCases.filter(isActiveEndLeasingCase);
}

export function historyVacatingCasesForProperty(vacatingCases: VacatingCase[]): VacatingCase[] {
  return vacatingCases.filter(isHistoryEndLeasingCase);
}
