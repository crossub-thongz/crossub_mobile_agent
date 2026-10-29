'use client';

import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MAINTENANCE_QUOTE_STATUS,
  OWNER_QUOTE_OUTCOME,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import { patchAgentProperty } from '@/lib/crossub-api/agent-client';
import {
  approveMaintenanceQuotation,
  declineMaintenanceQuotation,
  fetchAgentMaintenanceDetail,
  recordMaintenanceOwnerQuoteReply,
  sendMaintenanceQuoteToOwner,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';
import { prepareCrossubMaintenancePayment } from '@/lib/billing/crossub-maintenance-payment';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { crossubFeeLabel, crossubPayableAud } from '@/lib/maintenance/crossub-maintenance';
import {
  awaitingOwnerQuoteApproval,
  quoteDecisionCopiesOwner,
} from '@/lib/maintenance/self-managed-steps';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { isEmailAddress } from '@/utils/email-recipients';

/** Which inline form is open under a quote, if any. */
const QUOTE_FORM = {
  DECLINE: 'decline',
  SEND_TO_OWNER: 'send_to_owner',
  OWNER_DECLINED: 'owner_declined',
} as const;
type QuoteForm = (typeof QUOTE_FORM)[keyof typeof QUOTE_FORM];

/**
 * The submitted quotes side by side, lowest flagged, with approve and decline — and, because the
 * owner signs off on their own repairs, a way to email one quote to the owner and record their
 * answer. The owner replies to the agency (there is no approve link); "Owner approved" approves
 * the quote, which issues the work order. Decisions copy the owner above the repair limit.
 *
 * A CROSSUB quote is paid to CROSSUB by card first (the quote plus CROSSUB's fee), and approved
 * with that paid charge; CROSSUB then pays the tradie.
 */
export function QuoteCompareStep({
  detail,
  busy,
  run,
}: {
  detail: AgentMaintenanceDetail;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [open, setOpen] = useState<{ quoteId: string; form: QuoteForm } | null>(null);
  const [text, setText] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const pendingApproval = useRef<((chargeId: string) => Promise<unknown>) | null>(null);
  const submitted = detail.quotes.filter((q) => q.status === MAINTENANCE_QUOTE_STATUS.SUBMITTED);
  if (submitted.length === 0) return null;

  const offer = detail.crossubMaintenance;
  const blocked = busy || paying;

  const onFile = detail.owner.email;
  const typedOwnerEmail = ownerEmail.trim();
  const ownerEmailReady = Boolean(onFile) || isEmailAddress(typedOwnerEmail);

  const toggle = (quoteId: string, form: QuoteForm) => {
    setOpen(open?.quoteId === quoteId && open.form === form ? null : { quoteId, form });
    setText('');
  };
  const close = () => {
    setOpen(null);
    setText('');
  };

  // The quote routes return the card, not the detail, so the detail is re-read after.
  const thenDetail = (action: () => Promise<unknown>) => async () => {
    await action();
    return fetchAgentMaintenanceDetail(detail.id);
  };

  const decline = async (quotationId: string) => {
    const ok = await run(
      thenDetail(() => declineMaintenanceQuotation(detail.id, quotationId, text.trim())),
      COPY.quoteDeclined,
    );
    if (ok) close();
  };

  const sendToOwner = async (quotationId: string) => {
    const propertyId = detail.propertyId;
    const ok = await run(async () => {
      // No owner email on file: it is saved on the property first, where every owner copy reads it.
      if (!onFile && propertyId) {
        await patchAgentProperty(propertyId, { landlordEmail: typedOwnerEmail });
      }
      return sendMaintenanceQuoteToOwner(detail.id, quotationId, {
        ...(text.trim() ? { message: text.trim() } : {}),
      });
    }, COPY.sentToOwner);
    if (ok) {
      close();
      setOwnerEmail('');
    }
  };

  /** Approval carries no note; a decline carries what the owner said, as its reason. */
  const ownerReply = async (quotationId: string, approved: boolean, platformChargeId?: string) => {
    const note = approved ? '' : text.trim();
    const ok = await run(
      () =>
        recordMaintenanceOwnerQuoteReply(detail.id, quotationId, {
          outcome: approved ? OWNER_QUOTE_OUTCOME.APPROVED : OWNER_QUOTE_OUTCOME.DECLINED,
          ...(note ? { note } : {}),
          ...(platformChargeId ? { platformChargeId } : {}),
        }),
      approved ? COPY.ownerApproved : COPY.ownerDeclined,
    );
    if (ok) close();
  };

  /** Pay CROSSUB for a CROSSUB quote, then `approve` with the paid charge. */
  const withCrossubPayment = async (
    quotationId: string,
    approve: (chargeId: string) => Promise<unknown>,
  ) => {
    setPaying(true);
    try {
      const prepared = await prepareCrossubMaintenancePayment(detail.id, quotationId);
      if (prepared.status === 'needs_card') {
        pendingApproval.current = approve;
        setPaymentDialog(prepared.dialog);
        return;
      }
      if (!prepared.chargeId) throw new Error(COPY.loadFailed);
      await approve(prepared.chargeId);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const onPaid = async () => {
    const approve = pendingApproval.current;
    const chargeId = paymentDialog?.chargeId;
    pendingApproval.current = null;
    setPaymentDialog(null);
    if (!approve || !chargeId) return;
    setPaying(true);
    try {
      await finalizeBillingChargePayment(chargeId);
      toast.success(COPY.crossubPaid);
      await approve(chargeId);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const approve = (quotationId: string, crossub: boolean) =>
    crossub
      ? withCrossubPayment(quotationId, (chargeId) =>
          run(
            thenDetail(() => approveMaintenanceQuotation(detail.id, quotationId, chargeId)),
            COPY.quoteApproved,
          ),
        )
      : run(thenDetail(() => approveMaintenanceQuotation(detail.id, quotationId)), COPY.quoteApproved);

  const ownerApprove = (quotationId: string, crossub: boolean) =>
    crossub
      ? withCrossubPayment(quotationId, (chargeId) => ownerReply(quotationId, true, chargeId))
      : ownerReply(quotationId, true);

  return (
    <StepCard title={COPY.compareTitle} hint={COPY.compareHint}>
      <ul className="divide-border/60 divide-y">
        {submitted.map((q) => {
          const awaiting = awaitingOwnerQuoteApproval(detail, q.id);
          const form = open?.quoteId === q.id ? open.form : null;
          const crossub = Boolean(offer && q.crossubArranged);
          const payable =
            offer && q.total !== null ? formatCurrency(crossubPayableAud(q.total, offer)) : null;
          return (
            <li key={q.id} className="space-y-1.5 py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  {q.contractorName ?? COPY.tradie}
                </p>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {q.total === null ? COPY.noQuoteTotal : formatCurrency(q.total)}
                </p>
              </div>
              {q.scope ? <p className="text-muted-foreground line-clamp-2 text-xs">{q.scope}</p> : null}
              {crossub && offer ? (
                <p className="text-muted-foreground text-xs">
                  {COPY.crossubPayNote(crossubFeeLabel(offer))}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                {crossub ? (
                  <span className="border-primary/35 bg-primary/10 text-primary rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    {COPY.crossubBadge}
                  </span>
                ) : null}
                {q.isLowest ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    {COPY.lowest}
                  </span>
                ) : null}
                {quoteDecisionCopiesOwner(q.total, detail.spendThreshold) ? (
                  <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]">
                    {COPY.ownerCopied}
                  </span>
                ) : null}
                <span className="flex-1" />
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={blocked || (crossub && payable === null)}
                  onClick={() => void approve(q.id, crossub)}
                >
                  {crossub && payable ? COPY.crossubPayApprove(payable) : COPY.approve}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={blocked}
                  onClick={() => toggle(q.id, QUOTE_FORM.DECLINE)}
                >
                  {COPY.decline}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={blocked}
                  onClick={() => toggle(q.id, QUOTE_FORM.SEND_TO_OWNER)}
                >
                  {awaiting ? COPY.ownerResent : COPY.sendToOwner}
                </Button>
              </div>

              {awaiting ? (
                <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
                  <p className="text-xs">{COPY.ownerAwaiting(formatDateTime(awaiting.sentAt))}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={blocked}
                      onClick={() => void ownerApprove(q.id, crossub)}
                    >
                      {crossub && payable
                        ? COPY.crossubOwnerPayApprove(payable)
                        : COPY.ownerApprovedAction}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      disabled={blocked}
                      onClick={() => toggle(q.id, QUOTE_FORM.OWNER_DECLINED)}
                    >
                      {COPY.ownerDeclinedAction}
                    </Button>
                  </div>
                </div>
              ) : null}

              {form === QUOTE_FORM.DECLINE ? (
                <div className="flex gap-2">
                  <Input
                    aria-label={COPY.declineReason}
                    placeholder={COPY.declineReason}
                    value={text}
                    disabled={blocked}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={blocked || !text.trim()}
                    onClick={() => void decline(q.id)}
                  >
                    {COPY.declineConfirm}
                  </Button>
                </div>
              ) : null}

              {form === QUOTE_FORM.OWNER_DECLINED ? (
                <div className="flex gap-2">
                  <Input
                    aria-label={COPY.ownerDeclineNote}
                    placeholder={COPY.ownerDeclineNote}
                    value={text}
                    maxLength={LIMITS.ownerNoteMax}
                    disabled={blocked}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={blocked}
                    onClick={() => void ownerReply(q.id, false)}
                  >
                    {COPY.ownerDeclineConfirm}
                  </Button>
                </div>
              ) : null}

              {form === QUOTE_FORM.SEND_TO_OWNER ? (
                <div className="border-border/60 space-y-2 rounded-md border p-2.5">
                  <p className="text-xs font-medium">{COPY.sendToOwnerTitle}</p>
                  {onFile ? (
                    <p className="text-muted-foreground text-xs">{COPY.sendToOwnerHint(onFile)}</p>
                  ) : (
                    <div>
                      <FieldLabel htmlFor={`${id}-${q.id}-owner-email`}>
                        {COPY.ownerEmailLabel}
                      </FieldLabel>
                      <Input
                        id={`${id}-${q.id}-owner-email`}
                        type="email"
                        value={ownerEmail}
                        disabled={blocked || !detail.propertyId}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                      />
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {COPY.ownerEmailMissing}
                      </p>
                    </div>
                  )}
                  <div>
                    <FieldLabel htmlFor={`${id}-${q.id}-owner-message`}>
                      {COPY.ownerMessage}
                    </FieldLabel>
                    <Textarea
                      id={`${id}-${q.id}-owner-message`}
                      rows={2}
                      inputKind="message"
                      maxLength={LIMITS.ownerMessageMax}
                      value={text}
                      disabled={blocked}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={blocked || !ownerEmailReady}
                      onClick={() => void sendToOwner(q.id)}
                    >
                      {COPY.sendToOwnerConfirm}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={blocked} onClick={close}>
                      {COPY.cancel}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            pendingApproval.current = null;
            setPaymentDialog(null);
          }
        }}
        onSuccess={() => void onPaid()}
      />
    </StepCard>
  );
}
