'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { vacatingDetail } from '@/constants/routes';
import { vacatingWorkflowProgress } from '@/lib/case-workflows';
import { fromProperty } from '@/lib/detail-navigation';
import type { VacatingCase } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

/** Property hub summary — full workflow lives on the end-leasing case detail page. */
export function VacatingWorkflowTimeline({
  vacatingCase,
}: {
  vacatingCase: VacatingCase;
}) {
  const { currentStepLabel } = vacatingWorkflowProgress(vacatingCase);
  const caseRef = workflowCaseReferenceLabel(vacatingCase.id, 'end_leasing');

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {caseRef}
      </p>
      <p className="text-sm font-semibold">End leasing</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Vacate {formatDate(vacatingCase.vacateDate)} · {vacatingCase.reason}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Current stage: <span className="text-foreground font-medium">{currentStepLabel}</span>
      </p>
      <Button asChild size="sm" className="mt-3 h-9 w-full gap-1.5">
        <Link href={vacatingDetail(vacatingCase.id, fromProperty(vacatingCase.propertyId, 'Leasing'))}>
          <ExternalLink className="size-3.5" />
          Open end-leasing case
        </Link>
      </Button>
    </div>
  );
}
