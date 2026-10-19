'use client';

import { useState } from 'react';
import { HandCoins, MailSearch } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  NEGOTIATION_ANSWER,
  NEGOTIATION_PARTY_LABEL,
  SELF_MANAGED_LEASING_COPY as COPY,
  type NegotiationAnswer,
} from '@/constants/self-managed-leasing';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import {
  addSelfManagedNegotiationRound,
  requestSelfManagedApplicantInformation,
  respondToSelfManagedNegotiationRound,
} from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_UI } from '@/lib/leasing/constants';
import {
  acceptedNegotiationRound,
  buildAgentNegotiationProposal,
  EMPTY_NEGOTIATION_PROPOSAL,
  liveNegotiationRound,
  parseRequestedItems,
  proposalFormFromRound,
  type NegotiationProposalForm,
} from '@/lib/leasing/self-managed-letting';
import type { LeasingApplicationDetail } from '@/lib/leasing/types';
import type { ServerLeasingNegotiationRound } from '@/lib/leasing-cycle-types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const ACTION = {
  REQUEST_INFO: 'request-info',
  PROPOSE: 'propose',
  RESPOND: 'respond',
} as const;

type OpenForm = typeof ACTION.REQUEST_INFO | typeof ACTION.PROPOSE | null;

function roundTermsLine(round: ServerLeasingNegotiationRound): string {
  return [
    round.weeklyRent != null ? `${formatCurrency(round.weeklyRent)}/wk` : null,
    round.leaseTerm,
    round.startDate ? `from ${formatDate(round.startDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Self-Manage applicant actions on an applicant order: email the applicant for more
 * information, propose terms, and accept / decline / counter the round on the table.
 * Once the applicant is decided (`actionable` false), only the agreed terms show.
 */
export function LeasingSelfManagedApplicantActions({
  app,
  propertyId,
  cycleId,
  actionable,
}: {
  app: LeasingApplicationDetail;
  propertyId: string;
  cycleId?: string;
  actionable: boolean;
}) {
  const { pending, run } = useSelfManagedLettingAction(propertyId, cycleId);
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [itemsText, setItemsText] = useState('');
  const [message, setMessage] = useState('');
  const [proposal, setProposal] = useState<NegotiationProposalForm>(EMPTY_NEGOTIATION_PROPOSAL);

  const live = liveNegotiationRound(app.negotiation);
  const accepted = acceptedNegotiationRound(app.negotiation);
  const busy = pending !== null;

  const toggleForm = (form: Exclude<OpenForm, null>, prefill?: NegotiationProposalForm) => {
    if (openForm === form && !prefill) {
      setOpenForm(null);
      return;
    }
    if (form === ACTION.PROPOSE) setProposal(prefill ?? EMPTY_NEGOTIATION_PROPOSAL);
    setOpenForm(form);
  };

  const sendRequestInfo = async () => {
    const items = parseRequestedItems(itemsText);
    const trimmedMessage = message.trim();
    if (items.length === 0 && !trimmedMessage) {
      toast.error(COPY.requestInfoEmpty);
      return;
    }
    const ok = await run(
      ACTION.REQUEST_INFO,
      (id) =>
        requestSelfManagedApplicantInformation(propertyId, id, app.id, {
          items: items.length > 0 ? items : undefined,
          message: trimmedMessage || undefined,
        }),
      COPY.requestInfoSent(app.applicant),
    );
    if (ok) {
      setItemsText('');
      setMessage('');
      setOpenForm(null);
    }
  };

  const sendProposal = async () => {
    let body: ReturnType<typeof buildAgentNegotiationProposal>;
    try {
      body = buildAgentNegotiationProposal(proposal);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : COPY.proposeEmpty);
      return;
    }
    if (!body) {
      toast.error(COPY.proposeEmpty);
      return;
    }
    const ok = await run(
      ACTION.PROPOSE,
      (id) => addSelfManagedNegotiationRound(propertyId, id, app.id, body),
      COPY.proposeSent,
    );
    if (ok) {
      setProposal(EMPTY_NEGOTIATION_PROPOSAL);
      setOpenForm(null);
    }
  };

  const respond = (round: ServerLeasingNegotiationRound, response: NegotiationAnswer) =>
    void run(
      ACTION.RESPOND,
      (id) => respondToSelfManagedNegotiationRound(propertyId, id, app.id, round.id, { response }),
      response === NEGOTIATION_ANSWER.ACCEPTED ? COPY.roundAccepted : COPY.roundDeclined,
    );

  const setProposalField = (field: keyof NegotiationProposalForm, value: string) =>
    setProposal((current) => ({ ...current, [field]: value }));

  if (!actionable) {
    return accepted ? (
      <p className={cn('rounded-md px-2.5 py-1.5 text-[12.5px]', LEASING_UI.callout)}>
        {COPY.acceptedRound(accepted.roundNo)} · {roundTermsLine(accepted)}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
      {live ? (
        <div className={cn('space-y-2 rounded-md px-2.5 py-2 text-[12.5px]', LEASING_UI.callout)}>
          <p className="font-medium">
            {COPY.liveRoundTitle(live.roundNo, NEGOTIATION_PARTY_LABEL[live.proposedBy] ?? live.proposedBy)}
          </p>
          <p>{roundTermsLine(live)}</p>
          {live.note ? <p className="text-muted-foreground">{live.note}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn('h-7 px-2 text-xs', LEASING_UI.btnSuccess)}
              disabled={busy}
              onClick={() => respond(live, NEGOTIATION_ANSWER.ACCEPTED)}
            >
              {COPY.accept}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => respond(live, NEGOTIATION_ANSWER.DECLINED)}
            >
              {COPY.decline}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => toggleForm(ACTION.PROPOSE, proposalFormFromRound(live))}
            >
              {COPY.counter}
            </Button>
          </div>
        </div>
      ) : accepted ? (
        <p className={cn('rounded-md px-2.5 py-1.5 text-[12.5px]', LEASING_UI.callout)}>
          {COPY.acceptedRound(accepted.roundNo)} · {roundTermsLine(accepted)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('h-7 gap-1 px-2 text-xs', LEASING_UI.btnSecondary)}
          disabled={busy}
          onClick={() => toggleForm(ACTION.REQUEST_INFO)}
          aria-expanded={openForm === ACTION.REQUEST_INFO}
        >
          <MailSearch className="size-3.5" />
          {COPY.requestInfo}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('h-7 gap-1 px-2 text-xs', LEASING_UI.btnSecondary)}
          disabled={busy}
          onClick={() => toggleForm(ACTION.PROPOSE)}
          aria-expanded={openForm === ACTION.PROPOSE}
        >
          <HandCoins className="size-3.5" />
          {COPY.proposeTerms}
        </Button>
      </div>

      {openForm === ACTION.REQUEST_INFO ? (
        <div className="space-y-2 border-t pt-2">
          <div className="space-y-1">
            <Label htmlFor={`info-items-${app.id}`} className="text-xs">
              {COPY.requestInfoItems}
            </Label>
            <Textarea
              id={`info-items-${app.id}`}
              rows={3}
              value={itemsText}
              placeholder={COPY.requestInfoItemsPlaceholder}
              onChange={(e) => setItemsText(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`info-message-${app.id}`} className="text-xs">
              {COPY.requestInfoMessage}
            </Label>
            <Textarea
              id={`info-message-${app.id}`}
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => void sendRequestInfo()}
            >
              {pending === ACTION.REQUEST_INFO ? COPY.sending : COPY.requestInfoSend}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => setOpenForm(null)}
            >
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {openForm === ACTION.PROPOSE ? (
        <div className="space-y-2 border-t pt-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`propose-rent-${app.id}`} className="text-xs">
                {COPY.weeklyRent}
              </Label>
              <Input
                id={`propose-rent-${app.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={proposal.weeklyRent}
                onChange={(e) => setProposalField('weeklyRent', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`propose-term-${app.id}`} className="text-xs">
                {COPY.leaseTerm}
              </Label>
              <Input
                id={`propose-term-${app.id}`}
                value={proposal.leaseTerm}
                placeholder={COPY.leaseTermPlaceholder}
                onChange={(e) => setProposalField('leaseTerm', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`propose-start-${app.id}`} className="text-xs">
                {COPY.startDate}
              </Label>
              <Input
                id={`propose-start-${app.id}`}
                type="date"
                value={proposal.startDate}
                onChange={(e) => setProposalField('startDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`propose-note-${app.id}`} className="text-xs">
              {COPY.note}
            </Label>
            <Textarea
              id={`propose-note-${app.id}`}
              rows={2}
              value={proposal.note}
              onChange={(e) => setProposalField('note', e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => void sendProposal()}
            >
              {pending === ACTION.PROPOSE ? COPY.sending : COPY.proposeSend}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => setOpenForm(null)}
            >
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
