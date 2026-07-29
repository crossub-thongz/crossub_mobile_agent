'use client';

import { ChevronRight } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { ModuleMobileCardShell } from '@/components/agent/module-list-table';
import { vacatingWorkflowProgress } from '@/lib/case-workflows';
import { vacatingToJobRow } from '@/lib/portfolio-case-dialog';
import type { VacatingCase } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import type { PortfolioAgentData } from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';

export function EndLeasingCasesList({
  cases,
  selectedId,
  portfolioData,
  onOpenCase,
}: {
  cases: VacatingCase[];
  selectedId: string | null;
  portfolioData: PortfolioAgentData;
  onOpenCase: (job: PropertyJobRow) => void;
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        title="No end-leasing cases"
        description="Active end-leasing cases will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {cases.map((v) => {
        const { currentStepLabel } = vacatingWorkflowProgress(v);
        const caseRef = workflowCaseReferenceLabel(v.id, 'end_leasing');
        const vacateLabel = v.vacateDate ? `Vacate ${formatDate(v.vacateDate)}` : 'Vacate date TBC';
        const openCase = () => {
          const job = vacatingToJobRow(v, portfolioData);
          if (job) onOpenCase(job);
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
      })}
    </div>
  );
}
