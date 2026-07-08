import type { PropertyAccounting } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const ACCOUNTING_ARREARS_STEPS = [
  { id: 'current', label: 'Rent current' },
  { id: 'day_3', label: '3-day reminder' },
  { id: 'day_7', label: '7-day follow-up' },
  { id: 'day_14', label: '14-day escalation' },
  { id: 'day_21', label: '21-day tribunal prep' },
] as const;

function resolveArrearsStepId(daysInArrears: number, arrearsAmount: number): string {
  if (arrearsAmount <= 0 || daysInArrears <= 0) return 'current';
  if (daysInArrears >= 21) return 'day_21';
  if (daysInArrears >= 14) return 'day_14';
  if (daysInArrears >= 7) return 'day_7';
  return 'day_3';
}

export function accountingArrearsProgress(
  accounting: PropertyAccounting,
): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    accounting.arrearsAmount > 0 ? 'Arrears collection workflow' : 'Rent collection status',
    ACCOUNTING_ARREARS_STEPS,
    resolveArrearsStepId(accounting.daysInArrears, accounting.arrearsAmount),
  );
}
