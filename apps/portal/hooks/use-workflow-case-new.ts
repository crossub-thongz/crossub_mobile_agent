'use client';

import { useEffect } from 'react';

import { WORKFLOW_CASE_UI } from '@/constants/workflow-case-ui';
import type { AgentWorkflowCaseModule } from '@/lib/workflow-case-new-highlight';
import { useWorkflowCaseNewStore } from '@/lib/workflow-case-new-store';
import { cn } from '@/lib/utils';

export function useSeedWorkflowCaseSnapshot(
  module: AgentWorkflowCaseModule,
  caseIds: string[],
): void {
  const seedSnapshot = useWorkflowCaseNewStore((s) => s.seedSnapshot);
  const joined = caseIds.join('\u0000');

  useEffect(() => {
    seedSnapshot(module, joined ? joined.split('\u0000') : []);
  }, [module, joined, seedSnapshot]);
}

export function useWorkflowCaseIsNew(
  module: AgentWorkflowCaseModule,
  caseId: string,
): boolean {
  const revision = useWorkflowCaseNewStore((s) => s.revision);
  const isNew = useWorkflowCaseNewStore((s) => s.isNew);
  void revision;
  return isNew(module, caseId);
}

export function workflowCaseNewRowClass(isNew: boolean, className?: string): string {
  return cn(className, isNew && WORKFLOW_CASE_UI.newCaseRow);
}

export function workflowCaseNewCardClass(isNew: boolean, className?: string): string {
  return cn(className, isNew && WORKFLOW_CASE_UI.newCaseCard);
}
