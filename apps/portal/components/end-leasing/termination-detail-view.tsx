'use client';

import { useCallback, useEffect } from 'react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { Timeline } from '@/components/agent/timeline';
import {
  TerminationPhasePanel,
  TerminationPhaseTabs,
} from '@/components/end-leasing/termination-phase-panels';
import { SettlementDeductionDialog } from '@/components/end-leasing/settlement-deduction-dialog';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useLivePoll } from '@/lib/use-live-poll';
import { formatCurrency, formatDate } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export function TerminationDetailView({
  caseId,
  apiConnected,
}: {
  caseId: string;
  apiConnected: boolean;
}) {
  const loadCase = useEndLeasingStore((s) => s.loadCase);
  const caseData = useEndLeasingStore((s) => s.getCase(caseId));
  const status = useEndLeasingStore((s) => s.status[caseId] ?? 'idle');
  const error = useEndLeasingStore((s) => s.error[caseId]);
  const activeStage = useEndLeasingStore((s) => s.getActiveStage(caseId, caseData));
  const setActiveStage = useEndLeasingStore((s) => s.setActiveStage);

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
    <TerminationDetailContent
      caseData={caseData}
      activeStage={activeStage}
      onStageChange={(stage) => setActiveStage(caseId, stage)}
    />
  );
}

function TerminationDetailContent({
  caseData,
  activeStage,
  onStageChange,
}: {
  caseData: TerminationCaseDetail;
  activeStage: TerminationCaseDetail['currentStage'];
  onStageChange: (stage: TerminationCaseDetail['currentStage']) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Case ref {workflowCaseReferenceLabel(caseData.id, 'end_leasing')}
        </p>
        <h1 className="mt-1 text-base font-semibold">{caseData.property.address}</h1>
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

      {caseData.propertyId && (
        <CaseContactActions propertyId={caseData.propertyId} caseLabel="End leasing" />
      )}

      <TerminationPhaseTabs
        caseData={caseData}
        activeStage={activeStage}
        onStageChange={onStageChange}
      />

      <TerminationPhasePanel caseData={caseData} stage={activeStage} />

      {caseData.timeline.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <Timeline
            entries={caseData.timeline.map((e) => ({
              id: e.id,
              at: e.timestamp,
              actor: e.actor ?? 'System',
              actorRole: 'system' as const,
              source: 'app' as const,
              title: e.label,
              detail: e.kind ?? '',
            }))}
          />
        </section>
      )}

      <SettlementDeductionDialog caseData={caseData} />
    </div>
  );
}
