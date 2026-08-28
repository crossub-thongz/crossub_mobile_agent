'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { leasingDetail } from '@/constants/routes';
import { markAgentWorkflowCaseOpenedFromJob } from '@/lib/mark-agent-workflow-case-opened';
import type { PortfolioAgentData } from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { useAgentStore } from '@/lib/store';

export function usePortfolioCaseDialog() {
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
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
    if (!job) {
      setSelectedJob(null);
      return;
    }
    markAgentWorkflowCaseOpenedFromJob(job);
    if (isV2 && job.kind === 'leasing') {
      router.push(leasingDetail(job.id));
      return;
    }
    setSelectedJob(job);
  }, [isV2, router]);

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
