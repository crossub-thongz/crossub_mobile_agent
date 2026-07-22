'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { markAgentWorkflowCaseOpenedFromJob } from '@/lib/mark-agent-workflow-case-opened';
import type { PortfolioAgentData } from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { useAgentStore } from '@/lib/store';

export function usePortfolioCaseDialog() {
  const [selectedJob, setSelectedJob] = useState<PropertyJobRow | null>(null);
  const agentData = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const portfolioData = useMemo(
    (): PortfolioAgentData => ({
      properties: agentData.properties,
      maintenanceAll: agentData.maintenanceAll,
      inspections: agentData.inspections,
      rentReviews: agentData.rentReviews,
      tenantSelections: agentData.tenantSelections,
      tribunalCases: agentData.tribunalCases,
      vacating: agentData.vacating,
      accounting: agentData.accounting,
      leasingCycles: agentData.leasingCycles,
      leasingRecords: agentData.leasingRecords,
      rentReviewDecisions,
    }),
    [agentData, rentReviewDecisions],
  );

  const openJob = useCallback((job: PropertyJobRow | null) => {
    if (job) markAgentWorkflowCaseOpenedFromJob(job);
    setSelectedJob(job);
  }, []);

  const closeJob = useCallback(() => {
    setSelectedJob(null);
  }, []);

  return {
    selectedJob,
    selectedId: selectedJob?.id ?? null,
    openJob,
    closeJob,
    portfolioData,
    rentReviewDecisions,
  };
}
