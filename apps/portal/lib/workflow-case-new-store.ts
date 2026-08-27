'use client';

import { create } from 'zustand';

import {
  isWorkflowCaseNew,
  markWorkflowCaseOpened,
  seedWorkflowCaseSnapshot,
  type AgentWorkflowCaseModule,
} from '@/lib/workflow-case-new-highlight';

interface WorkflowCaseNewStore {
  revision: number;
  seedSnapshot: (module: AgentWorkflowCaseModule, caseIds: string[]) => void;
  isNew: (module: AgentWorkflowCaseModule, caseId: string) => boolean;
  markOpened: (module: AgentWorkflowCaseModule, caseId: string) => void;
}

export const useWorkflowCaseNewStore = create<WorkflowCaseNewStore>((set, get) => ({
  revision: 0,
  seedSnapshot: (module, caseIds) => {
    if (!seedWorkflowCaseSnapshot(module, caseIds)) return;
    set((state) => ({ revision: state.revision + 1 }));
  },
  isNew: (module, caseId) => {
    void get().revision;
    return isWorkflowCaseNew(module, caseId);
  },
  markOpened: (module, caseId) => {
    markWorkflowCaseOpened(module, caseId);
    set((state) => ({ revision: state.revision + 1 }));
  },
}));
