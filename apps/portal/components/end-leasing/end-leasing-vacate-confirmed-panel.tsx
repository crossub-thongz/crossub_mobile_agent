'use client';

import {
  EndLeasingKeysReturnSection,
  EndLeasingTenancyDetailsSection,
} from '@/components/end-leasing/end-leasing-case-sections';
import { endLeasingVacateDate } from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { formatDate } from '@/lib/utils';

export function EndLeasingVacateConfirmedPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const vacateDate = endLeasingVacateDate(caseData);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed bg-muted/15 px-3 py-2">
        <p className="text-sm">
          <span className="text-muted-foreground font-medium">Vacate: </span>
          <span className="font-semibold">
            {vacateDate ? formatDate(vacateDate) : 'date not confirmed'}
          </span>
        </p>
      </div>

      <EndLeasingTenancyDetailsSection caseData={caseData} />
      <EndLeasingKeysReturnSection caseData={caseData} />
    </div>
  );
}
