'use client';

import { ChevronRight } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { EndLeasingCasesList } from '@/components/agent/end-leasing-cases-list';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';

export default function VacatingPage() {
  const { vacating } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();

  return (
    <AgentShell title="End leasing">
      <div data-tour="vacating-case-list">
      <EndLeasingCasesList
        cases={vacating}
        selectedId={selectedId}
        portfolioData={portfolioData}
        onOpenCase={openJob}
      />
      </div>

      <PortfolioCaseDialogHost
        job={selectedJob}
        onClose={closeJob}
        onOpenJob={openJob}
      />
    </AgentShell>
  );
}
