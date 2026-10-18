'use client';

import { useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  VISIT_PROPOSAL_STATE,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  createSelfManagedMaintenanceQuote,
  recordMaintenanceVisitArranged,
  submitMaintenanceVisitTimes,
  type AgentMaintenanceContractorRef,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';
import { formatVisitAnchor, visitProposalState } from '@/lib/maintenance/self-managed-steps';
import { formatDateTime } from '@/lib/utils';

/** Enter a quote an invited tradie phoned or emailed in. */
export function EnterQuoteStep({
  requestId,
  contractors,
  busy,
  run,
}: {
  requestId: string;
  contractors: readonly AgentMaintenanceContractorRef[];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [pickedContractorId, setContractorId] = useState('');
  // Invites can arrive after mount, so the first invited tradie is the default until one is picked.
  const contractorId = pickedContractorId || contractors[0]?.id || '';
  const [price, setPrice] = useState('');
  const [scope, setScope] = useState('');
  const [availability, setAvailability] = useState('');
  const [comments, setComments] = useState('');

  if (contractors.length === 0) {
    return (
      <StepCard title={COPY.quoteTitle}>
        <p className="text-muted-foreground text-xs">{COPY.noInvitedTradies}</p>
      </StepCard>
    );
  }

  const priceValue = Number(price);
  const submit = async () => {
    const ok = await run(
      () =>
        createSelfManagedMaintenanceQuote(requestId, {
          contractorId,
          price: priceValue,
          scope: scope.trim(),
          ...(availability.trim() ? { availableSchedule: availability.trim() } : {}),
          ...(comments.trim() ? { comments: comments.trim() } : {}),
        }),
      COPY.quoteSaved,
    );
    if (ok) {
      setPrice('');
      setScope('');
      setAvailability('');
      setComments('');
    }
  };

  return (
    <StepCard title={COPY.quoteTitle} hint={COPY.quoteHint}>
      <div>
        <FieldLabel htmlFor={`${id}-tradie`}>{COPY.tradie}</FieldLabel>
        <select
          id={`${id}-tradie`}
          className={SELECT_CLASS}
          value={contractorId}
          disabled={busy}
          onChange={(e) => setContractorId(e.target.value)}
        >
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-price`}>{COPY.price}</FieldLabel>
        <Input
          id={`${id}-price`}
          type="number"
          min={1}
          inputMode="decimal"
          value={price}
          disabled={busy}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-scope`}>{COPY.quoteScope}</FieldLabel>
        <Textarea
          id={`${id}-scope`}
          rows={2}
          value={scope}
          disabled={busy}
          onChange={(e) => setScope(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-availability`}>{COPY.availability}</FieldLabel>
        <Input
          id={`${id}-availability`}
          value={availability}
          disabled={busy}
          onChange={(e) => setAvailability(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-comments`}>{COPY.comments}</FieldLabel>
        <Textarea
          id={`${id}-comments`}
          rows={2}
          value={comments}
          disabled={busy}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        disabled={busy || !contractorId || !(priceValue > 0) || !scope.trim()}
        onClick={() => void submit()}
      >
        {COPY.saveQuote}
      </Button>
    </StepCard>
  );
}

/**
 * Book the visit for the approved tradie: send the times they offered for the tenant to pick, or
 * record a time the two arranged between themselves. Once times are out it says so, and what the
 * tenant said if they turned them down; new times can still be sent.
 */
export function VisitBookingStep({
  requestId,
  proposal,
  busy,
  run,
}: {
  requestId: string;
  proposal: AgentMaintenanceDetail['scheduleProposal'];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const state = visitProposalState(proposal);
  const hint =
    proposal && state === VISIT_PROPOSAL_STATE.AWAITING_TENANT
      ? COPY.visitAwaitingTenant(formatDateTime(proposal.submittedAt), proposal.availableTimes)
      : proposal && state === VISIT_PROPOSAL_STATE.TENANT_DECLINED
        ? COPY.visitTenantDeclined(proposal.availableTimes, proposal.tenantDeclineReason)
        : undefined;
  const [times, setTimes] = useState('');
  const [arrangedAt, setArrangedAt] = useState('');
  const [note, setNote] = useState('');
  const anchor = formatVisitAnchor(arrangedAt);

  const sendTimes = async () => {
    const ok = await run(() => submitMaintenanceVisitTimes(requestId, times.trim()), COPY.visitTimesSent);
    if (ok) setTimes('');
  };

  const recordArranged = async () => {
    if (!anchor) return;
    const ok = await run(
      () =>
        recordMaintenanceVisitArranged(requestId, {
          availableTimes: anchor,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      COPY.visitRecorded,
    );
    if (ok) {
      setArrangedAt('');
      setNote('');
    }
  };

  return (
    <StepCard
      title={COPY.scheduleTitle}
      hint={hint}
      tone={state === VISIT_PROPOSAL_STATE.TENANT_DECLINED ? 'attention' : 'default'}
    >
      <div>
        <FieldLabel htmlFor={`${id}-times`}>{COPY.visitTimesLabel}</FieldLabel>
        <Input
          id={`${id}-times`}
          placeholder={COPY.visitTimesPlaceholder}
          value={times}
          disabled={busy}
          onChange={(e) => setTimes(e.target.value)}
        />
      </div>
      <Button size="sm" disabled={busy || !times.trim()} onClick={() => void sendTimes()}>
        {state === VISIT_PROPOSAL_STATE.NONE ? COPY.sendVisitTimes : COPY.sendNewVisitTimes}
      </Button>

      <div className="border-border/60 space-y-2 border-t pt-2.5">
        <FieldLabel htmlFor={`${id}-arranged`}>{COPY.arrangedLabel}</FieldLabel>
        <Input
          id={`${id}-arranged`}
          type="datetime-local"
          value={arrangedAt}
          disabled={busy}
          onChange={(e) => setArrangedAt(e.target.value)}
        />
        <Input
          aria-label={COPY.arrangedNote}
          placeholder={COPY.arrangedNote}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !anchor}
          onClick={() => void recordArranged()}
        >
          {COPY.recordVisit}
        </Button>
      </div>
    </StepCard>
  );
}
