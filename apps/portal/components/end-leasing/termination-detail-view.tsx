'use client';

import { useCallback, useEffect } from 'react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { EndLeasingAgentWorkflowPanel } from '@/components/end-leasing/end-leasing-agent-workflow-panel';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useLivePoll } from '@/lib/use-live-poll';
import { resolvePropertyDisplayAddress } from '@/lib/property-address';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function TerminationDetailView({
  caseId,
  apiConnected,
  hideHeader = false,
}: {
  caseId: string;
  apiConnected: boolean;
  hideHeader?: boolean;
}) {
  const loadCase = useEndLeasingStore((s) => s.loadCase);
  const caseData = useEndLeasingStore((s) => s.getCase(caseId));
  const status = useEndLeasingStore((s) => s.status[caseId] ?? 'idle');
  const error = useEndLeasingStore((s) => s.error[caseId]);

  const refresh = useCallback(async () => {
    await loadCase(caseId);
  }, [caseId, loadCase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected && Boolean(caseId));

  if (status === 'loading' && !caseData) {
    return <p className="text-muted-foreground text-sm">Loading end-leasing case…</p>;
  }

  if (status === 'error' && !caseData) {
    return <p className="text-destructive text-sm">{error ?? 'Could not load case'}</p>;
  }

  if (!caseData) {
    return <p className="text-muted-foreground text-sm">Case not found.</p>;
  }

  return (
    <TerminationDetailContent caseData={caseData} hideHeader={hideHeader} />
  );
}

function TerminationDetailContent({
  caseData,
  hideHeader = false,
}: {
  caseData: TerminationCaseDetail;
  hideHeader?: boolean;
}) {
  const { properties } = useAgentData();
  const displayAddress = resolvePropertyDisplayAddress(
    properties,
    caseData.propertyId,
    formatPropertyFullAddress({
      address: caseData.property.address,
      suburb: caseData.property.suburb,
    }),
  );

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <>
          <section className="rounded-2xl border bg-card p-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Case ref {workflowCaseReferenceLabel(caseData.id, 'end_leasing')}
            </p>
            <h1 className="mt-1 text-base font-semibold">{displayAddress}</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              {caseData.tenant.name}
              {caseData.vacateDate ? ` · Vacate ${formatDate(caseData.vacateDate)}` : ''}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Bond held</p>
                <p className="font-medium tabular-nums">{formatCurrency(caseData.bondHeld)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Refund</p>
                <p className="font-medium tabular-nums">{formatCurrency(caseData.refundAmount)}</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">{caseData.nextAction}</p>
          </section>

          {caseData.propertyId ? (
            <CaseContactActions propertyId={caseData.propertyId} caseLabel="End leasing" />
          ) : null}
        </>
      ) : null}

      <EndLeasingAgentWorkflowPanel caseData={caseData} />

      <SettlementDeductionDialog caseData={caseData} />
    </div>
  );
}
