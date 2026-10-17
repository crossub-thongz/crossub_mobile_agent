'use client';

import { useState } from 'react';
import { Loader2, Mail, MailX, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  OWNER_DECISION_COPY,
  OWNER_DECISION_SUMMARY_MAX_LENGTH,
  type OwnerDecisionOption,
} from '@/constants/owner-decision';
import { useOwnerDecisions } from '@/hooks/use-owner-decisions';
import {
  createOwnerDecision,
  type AgentOwnerDecision,
  type AgentOwnerDecisionCaseType,
} from '@/lib/crossub-api/agent-client';
import {
  ownerDecisionEmailBody,
  ownerDecisionEmailStatusLabel,
  ownerDecisionEmailStatusTone,
  ownerDecisionEmailSubject,
  ownerDecisionRecordedToast,
  planOwnerDecisionEmail,
} from '@/lib/owner-decision';
import { cn, formatDateTime } from '@/lib/utils';

export function OwnerDecisionEmailStatusPill({
  status,
  className,
}: {
  status: AgentOwnerDecision['emailStatus'];
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        ownerDecisionEmailStatusTone(status),
        className,
      )}
    >
      {ownerDecisionEmailStatusLabel(status)}
    </span>
  );
}

/** One recorded decision: what, why, who, when, and what became of the owner copy. */
export function OwnerDecisionRecordCard({
  decision,
  className,
  onDismiss,
}: {
  decision: AgentOwnerDecision;
  className?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-3 text-sm', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-medium leading-snug">{decision.decision}</p>
        <div className="flex shrink-0 items-center gap-1">
          <OwnerDecisionEmailStatusPill status={decision.emailStatus} />
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground rounded p-0.5"
              aria-label={OWNER_DECISION_COPY.dismiss}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-muted-foreground mt-1 whitespace-pre-line text-xs leading-relaxed">
        {decision.summary}
      </p>
      <p className="text-muted-foreground mt-2 text-[11px]">
        {formatDateTime(decision.createdAt)}
        {decision.decidedByName ? ` · ${OWNER_DECISION_COPY.by} ${decision.decidedByName}` : ''}
        {decision.emailStatus && decision.ownerEmail
          ? ` · ${OWNER_DECISION_COPY.sentTo} ${decision.ownerEmail}`
          : ''}
      </p>
    </div>
  );
}

/** Decisions recorded on a property (optionally one job), newest first. */
export function OwnerDecisionTimeline({
  propertyId,
  caseType,
  caseId,
  refreshToken = 0,
  className,
}: {
  propertyId: string;
  caseType?: AgentOwnerDecisionCaseType;
  caseId?: string;
  /** Bump after a new decision so the list refetches. */
  refreshToken?: number;
  className?: string;
}) {
  const { items, loading, error, reload } = useOwnerDecisions(
    propertyId,
    { caseType, caseId },
    refreshToken,
  );

  if (loading && items.length === 0) {
    return (
      <p className={cn('text-muted-foreground flex items-center gap-2 text-xs', className)}>
        <Loader2 className="size-3.5 animate-spin" />
        {OWNER_DECISION_COPY.timelineLoading}
      </p>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-between gap-2 text-xs', className)}>
        <p className="text-destructive min-w-0">
          {OWNER_DECISION_COPY.timelineError}: {error}
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={reload}>
          <RotateCw className="size-3" />
          {OWNER_DECISION_COPY.retry}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-xs', className)}>
        {OWNER_DECISION_COPY.timelineEmpty}
      </p>
    );
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {items.map((item) => (
        <li key={item.id}>
          <OwnerDecisionRecordCard decision={item} />
        </li>
      ))}
    </ol>
  );
}

function OwnerEmailPreview({
  ownerEmail,
  ownerName,
  agencyName,
  propertyAddress,
  decision,
  summary,
  selfManaged,
}: {
  ownerEmail?: string | null;
  ownerName?: string | null;
  agencyName: string;
  propertyAddress: string;
  decision: string;
  summary: string;
  selfManaged: boolean;
}) {
  const plan = planOwnerDecisionEmail({ selfManaged, ownerEmail });

  if (!plan.send) {
    return (
      <div className="bg-muted/40 flex gap-2 rounded-lg border p-3 text-xs">
        <MailX className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{OWNER_DECISION_COPY.recordOnlyHeading}</p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">{plan.reason}</p>
        </div>
      </div>
    );
  }

  const to = ownerName?.trim() ? `${ownerName.trim()} <${plan.to}>` : plan.to;
  return (
    <div className="overflow-hidden rounded-lg border text-xs">
      <p className="bg-muted/40 flex items-center gap-1.5 border-b px-3 py-2 font-medium">
        <Mail className="size-3.5" />
        {OWNER_DECISION_COPY.previewHeading}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b px-3 py-2">
        <dt className="text-muted-foreground">{OWNER_DECISION_COPY.previewTo}</dt>
        <dd className="min-w-0 truncate">{to}</dd>
        <dt className="text-muted-foreground">{OWNER_DECISION_COPY.previewFrom}</dt>
        <dd className="min-w-0 truncate">
          {agencyName}{' '}
          <span className="text-muted-foreground">{OWNER_DECISION_COPY.previewFromSuffix}</span>
        </dd>
        <dt className="text-muted-foreground">{OWNER_DECISION_COPY.previewSubject}</dt>
        <dd className="min-w-0 truncate font-medium">
          {ownerDecisionEmailSubject(decision, propertyAddress)}
        </dd>
      </dl>
      <pre className="text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap px-3 py-2 font-sans leading-relaxed">
        {ownerDecisionEmailBody({
          ownerName,
          agencyName,
          address: propertyAddress,
          decision,
          summary: summary.trim(),
        })}
      </pre>
    </div>
  );
}

/**
 * Decision buttons with a confirm step: an editable summary and a preview of the owner's emailed
 * copy (Self-Manage with an owner email on file), or a note that the decision is recorded only.
 * Confirm records it through `createOwnerDecision` and shows the saved record with its email status.
 */
export function DecisionWithOwnerEmail({
  propertyId,
  propertyAddress,
  caseType,
  caseId,
  ownerEmail,
  ownerName,
  agencyName,
  selfManaged,
  options,
  onRecorded,
  className,
}: {
  propertyId: string;
  propertyAddress: string;
  caseType: AgentOwnerDecisionCaseType;
  caseId?: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  agencyName: string;
  selfManaged: boolean;
  options: readonly OwnerDecisionOption[];
  onRecorded?: (decision: AgentOwnerDecision) => void;
  className?: string;
}) {
  const [active, setActive] = useState<OwnerDecisionOption | null>(null);
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<AgentOwnerDecision | null>(null);
  const plan = planOwnerDecisionEmail({ selfManaged, ownerEmail });
  const summaryMissing = summary.trim().length === 0;

  const open = (option: OwnerDecisionOption) => {
    setActive(option);
    setSummary(option.summary);
    setError(null);
  };

  const close = () => {
    if (saving) return;
    setActive(null);
    setError(null);
  };

  const confirm = async () => {
    if (!active) return;
    if (summaryMissing) {
      setError(OWNER_DECISION_COPY.summaryRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createOwnerDecision(propertyId, {
        caseType,
        ...(caseId ? { caseId } : {}),
        decision: active.decision,
        summary: summary.trim(),
      });
      toast.success(ownerDecisionRecordedToast(result.emailStatus));
      setRecorded(result);
      setActive(null);
      onRecorded?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : OWNER_DECISION_COPY.toastError;
      setError(message);
      toast.error(OWNER_DECISION_COPY.toastError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => open(option)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {recorded ? (
        <div>
          <p className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
            {OWNER_DECISION_COPY.recordedHeading}
          </p>
          <OwnerDecisionRecordCard decision={recorded} onDismiss={() => setRecorded(null)} />
        </div>
      ) : null}

      <Dialog open={active !== null} onOpenChange={(next) => (next ? undefined : close())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{OWNER_DECISION_COPY.confirmTitle}</DialogTitle>
            <DialogDescription>
              {active?.decision} · {propertyAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="owner-decision-summary">{OWNER_DECISION_COPY.summaryLabel}</Label>
              <Textarea
                id="owner-decision-summary"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (error) setError(null);
                }}
                rows={4}
                maxLength={OWNER_DECISION_SUMMARY_MAX_LENGTH}
                disabled={saving}
              />
              <p className="text-muted-foreground text-[11px]">
                {OWNER_DECISION_COPY.confirmDescription}
              </p>
            </div>

            {active ? (
              <OwnerEmailPreview
                ownerEmail={ownerEmail}
                ownerName={ownerName}
                agencyName={agencyName}
                propertyAddress={propertyAddress}
                decision={active.decision}
                summary={summary}
                selfManaged={selfManaged}
              />
            ) : null}

            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={saving}>
              {OWNER_DECISION_COPY.cancel}
            </Button>
            <Button type="button" onClick={() => void confirm()} disabled={saving || summaryMissing}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {OWNER_DECISION_COPY.saving}
                </>
              ) : plan.send ? (
                OWNER_DECISION_COPY.confirmSend
              ) : (
                OWNER_DECISION_COPY.confirmRecord
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
