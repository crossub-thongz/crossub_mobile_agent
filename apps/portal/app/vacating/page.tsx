'use client';

import { ChevronRight } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { ModuleMobileCardShell } from '@/components/agent/module-list-table';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { vacatingWorkflowProgress } from '@/lib/case-workflows';
import { vacatingToJobRow } from '@/lib/portfolio-case-dialog';
import { formatDate } from '@/lib/utils';

export default function VacatingPage() {
  const { vacating } = useAgentData();
  const { selectedJob, selectedId, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();

  return (
    <AgentShell title="End leasing">
      <div className="space-y-2">
        {vacating.length === 0 ? (
          <EmptyState
            title="No end-leasing cases"
            description="Active end-leasing cases will appear here."
          />
        ) : (
          vacating.map((v) => {
            const { currentStepLabel } = vacatingWorkflowProgress(v);
            const caseRef = workflowCaseReferenceLabel(v.id, 'end_leasing');
            const vacateLabel = v.vacateDate ? `Vacate ${formatDate(v.vacateDate)}` : 'Vacate date TBC';
            const openCase = () => {
              const job = vacatingToJobRow(v, portfolioData);
              if (job) openJob(job);
            };

            return (
              <ModuleMobileCardShell
                key={v.id}
                onClick={openCase}
                selected={selectedId === v.id}
                highlight={v.requiresApproval}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{caseRef}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {v.propertyAddress}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-primary font-medium">{currentStepLabel}</span>
                  <span className="text-muted-foreground">{vacateLabel}</span>
                  {v.requiresApproval ? (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Action required
                    </span>
                  ) : null}
                </div>
              </ModuleMobileCardShell>
            );
          })
        )}
      </div>

      <PortfolioCaseDialogHost
        job={selectedJob}
        onClose={closeJob}
        onOpenJob={openJob}
      />
    </AgentShell>
  );
}
