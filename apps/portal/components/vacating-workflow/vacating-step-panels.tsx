'use client';

import { useState } from 'react';
import { ClipboardList, FileText, KeyRound, Sparkles, Wrench } from 'lucide-react';

import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { Button } from '@/components/ui/button';
import { fromProperty } from '@/lib/detail-navigation';
import { LEASING_ITEM_STATUS, LEASING_TONE } from '@/lib/leasing/constants';
import {
  VACATING_CHECKLIST_LABEL,
  VACATING_LIFECYCLE_STEP,
  type VacatingLifecycleStep,
} from '@/lib/vacating/constants';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';
import type { Inspection } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

function ChecklistStepPanel({
  detail,
  step,
  icon: Icon,
  description,
}: {
  detail: VacatingPropertyDetail;
  step: VacatingLifecycleStep;
  icon: typeof FileText;
  description: string;
}) {
  const status = detail.stepStatus[step];
  const done = status === 'done';
  const disputed = status === 'dispute';

  return (
    <StepCard icon={Icon} title={VACATING_CHECKLIST_LABEL[step]} description={description}>
      <BoolStatus
        done={done}
        doneLabel={`${VACATING_CHECKLIST_LABEL[step]} complete`}
        pendingLabel={
          disputed ? `${VACATING_CHECKLIST_LABEL[step]} — dispute raised` : 'Not yet complete'
        }
      />
      {disputed ? (
        <LeasingToneBadge tone={LEASING_TONE.DESTRUCTIVE} label="Dispute" size="xs" />
      ) : null}
    </StepCard>
  );
}

export function VacatingStepOutgoingInspection({
  detail,
  inspection,
}: {
  detail: VacatingPropertyDetail;
  inspection?: Inspection;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const outgoing = detail.outgoingInspection;

  return (
    <div className="space-y-3">
      <StepCard
        icon={ClipboardList}
        title="Outgoing inspection"
        description="Inspect the vacated property and compare against the ingoing report."
        status={outgoing.status}
      >
        <div className="grid grid-cols-2 gap-3">
          <StepFact label="Vacate date" value={formatDate(detail.vacateDate)} />
          <StepFact
            label="Inspection status"
            value={outgoing.summary ?? inspection?.status ?? 'Not scheduled'}
          />
          {outgoing.scheduledAt ? (
            <StepFact label="Scheduled" value={formatDateTime(outgoing.scheduledAt)} />
          ) : null}
          {outgoing.inspector ? <StepFact label="Inspector" value={outgoing.inspector} /> : null}
          {outgoing.reportStatus ? (
            <StepFact label="Report" value={outgoing.reportStatus} />
          ) : null}
        </div>
        <BoolStatus
          done={outgoing.status === LEASING_ITEM_STATUS.DONE}
          doneLabel="Outgoing inspection complete"
          pendingLabel="Outgoing inspection pending"
        />
      </StepCard>

      {inspection ? (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
          View outgoing inspection details
        </Button>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-center text-xs">
          CROSSUB will schedule the outgoing inspection after vacate notice is confirmed.
        </p>
      )}

      {inspection ? (
        <InspectionDetailDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          inspection={inspection}
          navContext={fromProperty(detail.propertyId, 'Leasing')}
        />
      ) : null}
    </div>
  );
}

export function VacatingStepVacateNotice({ detail }: { detail: VacatingPropertyDetail }) {
  return (
    <div className="space-y-3">
      <ChecklistStepPanel
        detail={detail}
        step={VACATING_LIFECYCLE_STEP.VACATE_NOTICE}
        icon={FileText}
        description="Confirm the tenant vacate notice and expected move-out date."
      />
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Vacate details
        </p>
        <p className="mt-1 text-sm font-semibold">{formatDate(detail.vacateDate)}</p>
        <p className="text-muted-foreground mt-1 text-xs">{detail.reason}</p>
      </div>
      {detail.timeline.length > 0 ? (
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Recent activity
          </p>
          <ul className="space-y-2">
            {detail.timeline.slice(0, 3).map((entry) => (
              <li key={entry.id} className="text-xs">
                <p className="font-medium">{entry.title}</p>
                <p className="text-muted-foreground">{formatDateTime(entry.at)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function VacatingStepBondClaim({ detail }: { detail: VacatingPropertyDetail }) {
  return (
    <div className="space-y-3">
      <ChecklistStepPanel
        detail={detail}
        step={VACATING_LIFECYCLE_STEP.BOND_CLAIM}
        icon={Sparkles}
        description="Review deductions and approve the bond settlement."
      />
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Bond status
        </p>
        <p className="mt-1 text-sm font-semibold">{detail.bondStatus}</p>
        {detail.requiresBondApproval ? (
          <div className="mt-2">
            <LeasingToneBadge tone={LEASING_TONE.WARNING} label="Agent approval required" size="xs" />
          </div>
        ) : null}
      </div>
      {detail.bondBreakdown.length > 0 ? (
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Bond breakdown
          </p>
          <ul className="space-y-2">
            {detail.bondBreakdown.map((line) => (
              <li key={line.label} className="flex items-center justify-between text-sm">
                <span>{line.label}</span>
                <span className="font-medium tabular-nums">{formatCurrency(line.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function VacatingStepPanel({
  step,
  detail,
  inspection,
}: {
  step: VacatingLifecycleStep;
  detail: VacatingPropertyDetail;
  inspection?: Inspection;
}) {
  switch (step) {
    case VACATING_LIFECYCLE_STEP.VACATE_NOTICE:
      return <VacatingStepVacateNotice detail={detail} />;
    case VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION:
      return <VacatingStepOutgoingInspection detail={detail} inspection={inspection} />;
    case VACATING_LIFECYCLE_STEP.EXIT_CLEANING:
      return (
        <ChecklistStepPanel
          detail={detail}
          step={step}
          icon={Sparkles}
          description="Confirm exit cleaning has been completed to standard."
        />
      );
    case VACATING_LIFECYCLE_STEP.KEYS_RETURNED:
      return (
        <ChecklistStepPanel
          detail={detail}
          step={step}
          icon={KeyRound}
          description="Collect all keys, remotes and access devices."
        />
      );
    case VACATING_LIFECYCLE_STEP.UTILITIES_MAINTENANCE:
      return (
        <ChecklistStepPanel
          detail={detail}
          step={step}
          icon={Wrench}
          description="Finalise utilities and any vacating-related maintenance."
        />
      );
    case VACATING_LIFECYCLE_STEP.BOND_CLAIM:
      return <VacatingStepBondClaim detail={detail} />;
    default:
      return null;
  }
}
