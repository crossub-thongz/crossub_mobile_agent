'use client';

import { useSeedWorkflowCaseSnapshot } from '@/hooks/use-workflow-case-new';
import type { AgentWorkflowCaseModule } from '@/lib/workflow-case-new-highlight';

export function WorkflowCaseListSeeder({
  module,
  caseIds,
}: {
  module: AgentWorkflowCaseModule;
  caseIds: string[];
}) {
  useSeedWorkflowCaseSnapshot(module, caseIds);
  return null;
}
