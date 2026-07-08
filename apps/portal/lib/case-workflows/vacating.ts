import { TERMINATION_STAGE } from '@/constants/api-enums';
import type { VacatingCase } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const VACATING_AGENT_STEPS = [
  { id: TERMINATION_STAGE.VACATE, label: 'Vacate notice' },
  { id: TERMINATION_STAGE.OUTGOING_INSPECTION, label: 'Outgoing inspection' },
  { id: TERMINATION_STAGE.MAKE_GOOD, label: 'Make good' },
  { id: TERMINATION_STAGE.SETTLEMENT, label: 'Settlement' },
  { id: TERMINATION_STAGE.AGENT_APPROVAL, label: 'Agent approval' },
  { id: TERMINATION_STAGE.BOND, label: 'Bond refund' },
  { id: TERMINATION_STAGE.CLOSURE, label: 'Lease closure' },
] as const;

function resolveVacatingStepId(terminationStage?: string, status?: string): string {
  if (status === 'COMPLETED') return TERMINATION_STAGE.CLOSURE;
  switch (terminationStage) {
    case 'VACATE':
      return TERMINATION_STAGE.VACATE;
    case 'OUTGOING_INSPECTION':
      return TERMINATION_STAGE.OUTGOING_INSPECTION;
    case 'MAKE_GOOD':
      return TERMINATION_STAGE.MAKE_GOOD;
    case 'SETTLEMENT':
      return TERMINATION_STAGE.SETTLEMENT;
    case 'AGENT_APPROVAL':
      return TERMINATION_STAGE.AGENT_APPROVAL;
    case 'BOND':
      return TERMINATION_STAGE.BOND;
    case 'CLOSURE':
      return TERMINATION_STAGE.CLOSURE;
    default:
      return TERMINATION_STAGE.VACATE;
  }
}

export function vacatingWorkflowProgress(vacating: VacatingCase): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'End leasing workflow',
    VACATING_AGENT_STEPS,
    resolveVacatingStepId(vacating.terminationStage, vacating.apiStatus),
  );
}
