import { TRIBUNAL_CASE_STATUS } from '@/constants/api-enums';
import type { TribunalCase } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress } from './types';

const TRIBUNAL_AGENT_STEPS = [
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'awaiting_hearing', label: 'Awaiting hearing' },
  { id: 'hearing_scheduled', label: 'Hearing scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Closed' },
] as const;

function resolveTribunalStepId(apiStatus?: string): string {
  switch (apiStatus) {
    case TRIBUNAL_CASE_STATUS.DRAFT:
      return 'draft';
    case TRIBUNAL_CASE_STATUS.SUBMITTED:
      return 'submitted';
    case TRIBUNAL_CASE_STATUS.AWAITING_HEARING:
      return 'awaiting_hearing';
    case TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED:
      return 'hearing_scheduled';
    case TRIBUNAL_CASE_STATUS.COMPLETED:
      return 'completed';
    case TRIBUNAL_CASE_STATUS.CLOSED:
      return 'closed';
    default:
      return 'draft';
  }
}

export function tribunalWorkflowProgress(tribunalCase: TribunalCase): CaseWorkflowProgress {
  return buildCaseWorkflowProgress(
    'Tribunal workflow',
    TRIBUNAL_AGENT_STEPS,
    resolveTribunalStepId(tribunalCase.apiStatus),
  );
}
