'use client';

import { useEffect } from 'react';

import { WORKFLOW_TOUR_FOCUS_TAB_EVENT } from '@/lib/workflow-tour-tab-focus';

export function useWorkflowTourTabFocus<T extends string>(
  setActiveTab: (tab: T) => void,
  workflowTabId: T,
) {
  useEffect(() => {
    const handler = () => setActiveTab(workflowTabId);
    window.addEventListener(WORKFLOW_TOUR_FOCUS_TAB_EVENT, handler);
    return () => window.removeEventListener(WORKFLOW_TOUR_FOCUS_TAB_EVENT, handler);
  }, [setActiveTab, workflowTabId]);
}
