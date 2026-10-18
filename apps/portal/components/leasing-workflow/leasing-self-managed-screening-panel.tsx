'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Phone, Sparkles, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CROS_SCORE_LEVEL_LABEL,
  REFERENCE_CHECK_STATUS,
  REFERENCE_CHECK_STATUS_LABEL,
  REFERENCE_RECOMMENDATION,
  REFERENCE_RECOMMENDATION_LABEL,
  REFERENCE_SUPPORT,
  REFERENCE_SUPPORT_LABEL,
  SELF_MANAGED_LEASING_COPY as LETTING_COPY,
  SELF_MANAGED_SCREENING_COPY as COPY,
  type ReferenceCheckStatus,
  type ReferenceRecommendation,
  type ReferenceSupport,
} from '@/constants/self-managed-leasing';
import {
  REFERENCE_CHECK_ACTION,
  useSelfManagedReferenceCheck,
} from '@/hooks/use-self-managed-reference-check';
import type { AgentReferenceCheck } from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_TONE, LEASING_UI, type LeasingTone } from '@/lib/leasing/constants';
import type { LeasingApplicationDetail } from '@/lib/leasing/types';
import { cn } from '@/lib/utils';

const SCORE_TONE: Record<keyof typeof CROS_SCORE_LEVEL_LABEL, LeasingTone> = {
  strong: LEASING_TONE.SUCCESS,
  medium: LEASING_TONE.WARNING,
  risk: LEASING_TONE.DESTRUCTIVE,
};

const STATUS_TONE: Record<ReferenceCheckStatus, LeasingTone> = {
  [REFERENCE_CHECK_STATUS.RECORDED]: LEASING_TONE.SUCCESS,
  [REFERENCE_CHECK_STATUS.NOT_STARTED]: LEASING_TONE.WARNING,
  [REFERENCE_CHECK_STATUS.NO_REFEREES]: LEASING_TONE.MUTED,
  [REFERENCE_CHECK_STATUS.UNVERIFIED]: LEASING_TONE.MUTED,
};

const SUPPORT_TONE: Record<ReferenceSupport, LeasingTone> = {
  [REFERENCE_SUPPORT.YES]: LEASING_TONE.SUCCESS,
  [REFERENCE_SUPPORT.NO]: LEASING_TONE.DESTRUCTIVE,
  [REFERENCE_SUPPORT.UNCLEAR]: LEASING_TONE.WARNING,
};

const RECOMMENDATIONS: readonly ReferenceRecommendation[] = [
  REFERENCE_RECOMMENDATION.RECOMMEND,
  REFERENCE_RECOMMENDATION.REJECT,
];

function CrosScoreLine({ app }: { app: LeasingApplicationDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
      <span className="text-muted-foreground">{COPY.crosScore}</span>
      {app.aiScoreLevel ? (
        <LeasingToneBadge
          tone={SCORE_TONE[app.aiScoreLevel]}
          label={`${CROS_SCORE_LEVEL_LABEL[app.aiScoreLevel]}${app.aiScore ? ` · ${app.aiScore}` : ''}`}
          size="xs"
        />
      ) : (
        <span>{COPY.noScore}</span>
      )}
    </div>
  );
}

function RefereeList({ check }: { check: AgentReferenceCheck }) {
  if (check.referees.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {COPY.referees} ({check.contactableCount}/{check.refereeCount})
      </p>
      <ul className="space-y-1.5">
        {check.referees.map((referee) => (
          <li
            key={`${referee.kind}-${referee.name}`}
            className="rounded-md border bg-background px-2.5 py-1.5 text-[12px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{referee.name}</span>
              {referee.phone ? (
                <a
                  href={`tel:${referee.phone}`}
                  className="text-primary inline-flex items-center gap-1 underline"
                >
                  <Phone className="size-3" />
                  {referee.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">{COPY.noPhone}</span>
              )}
            </div>
            <p className="text-muted-foreground">
              {[referee.kindLabel, referee.relationship, referee.context].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryBlock({ check }: { check: AgentReferenceCheck }) {
  if (!check.summary) return null;
  const { summary } = check;
  return (
    <div className={cn('space-y-1.5 rounded-md px-2.5 py-2 text-[12.5px]', LEASING_UI.callout)}>
      <p className="flex items-center gap-1.5 font-medium">
        <Sparkles className={cn('size-3', LEASING_UI.accentIcon)} />
        {COPY.summaryTitle}
      </p>
      <p>{summary.summary}</p>
      <LeasingToneBadge
        tone={SUPPORT_TONE[summary.supportsRecommendation]}
        label={REFERENCE_SUPPORT_LABEL[summary.supportsRecommendation]}
        size="xs"
      />
      {summary.concerns.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
            {COPY.concerns}
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            {summary.concerns.map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Self-Manage screening on an applicant order: the Cros score, and the reference check the
 * agent runs themselves. Referees come from the application form; the agent records notes and
 * a recommendation, and Cros can summarise the notes (display only, never stored).
 */
export function LeasingSelfManagedScreeningPanel({
  app,
  propertyId,
  cycleId,
  readOnly = false,
}: {
  app: LeasingApplicationDetail;
  propertyId: string;
  cycleId?: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { check, loading, error, pending, save, summarise } = useSelfManagedReferenceCheck(
    propertyId,
    cycleId,
    app.id,
    open,
  );
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState<ReferenceRecommendation | null>(null);

  // Reset the form to the server's copy when it changes (load or save), not on a summary.
  const serverNotes = check?.notes;
  const serverRecommendation = check?.recommendation;
  useEffect(() => {
    if (serverNotes === undefined) return;
    setNotes(serverNotes);
    setRecommendation(serverRecommendation ?? null);
  }, [serverNotes, serverRecommendation]);

  const locked = readOnly || Boolean(check?.feedbackSent);
  const busy = pending !== null;

  const submit = async () => {
    const trimmed = notes.trim();
    if (!trimmed && !recommendation) {
      toast.error(COPY.saveEmpty);
      return;
    }
    await save({
      feedback: trimmed || undefined,
      recommendation: recommendation ?? undefined,
    });
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <UserCheck className="size-3.5" />
          {COPY.title}
        </p>
        {check ? (
          <LeasingToneBadge
            tone={STATUS_TONE[check.status]}
            label={REFERENCE_CHECK_STATUS_LABEL[check.status]}
            size="xs"
          />
        ) : null}
      </div>

      <CrosScoreLine app={app} />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn('h-7 gap-1 px-2 text-xs', LEASING_UI.btnSecondary)}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        {open ? COPY.hide : COPY.show}
      </Button>

      {open ? (
        loading && !check ? (
          <p className="text-muted-foreground text-[12px]">{COPY.loading}</p>
        ) : error && !check ? (
          <p className="text-destructive text-[12px]">{error}</p>
        ) : check ? (
          <div className="space-y-3 border-t pt-2">
            <RefereeList check={check} />

            {check.notices.length > 0 ? (
              <ul className="text-muted-foreground space-y-0.5 text-[12px]">
                {check.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            ) : null}

            {check.feedbackSent ? (
              <p className="text-muted-foreground text-[12px]">{COPY.feedbackSent}</p>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor={`reference-notes-${app.id}`} className="text-xs">
                {COPY.notes}
              </Label>
              <Textarea
                id={`reference-notes-${app.id}`}
                rows={4}
                value={notes}
                placeholder={COPY.notesPlaceholder}
                disabled={locked || busy}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium">{COPY.recommendation}</p>
              <div className="flex gap-1.5">
                {RECOMMENDATIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={locked || busy}
                    onClick={() => setRecommendation(recommendation === value ? null : value)}
                    aria-pressed={recommendation === value}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      recommendation === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted/60',
                      (locked || busy) && 'pointer-events-none opacity-50',
                    )}
                  >
                    {REFERENCE_RECOMMENDATION_LABEL[value]}
                  </button>
                ))}
              </div>
            </div>

            {!readOnly ? (
              <div className="flex flex-wrap gap-1.5">
                {!locked ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    {pending === REFERENCE_CHECK_ACTION.SAVE ? LETTING_COPY.saving : COPY.save}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={busy || !check.notes}
                  onClick={() => void summarise()}
                >
                  <Sparkles className="size-3.5" />
                  {pending === REFERENCE_CHECK_ACTION.SUMMARISE ? COPY.summarising : COPY.summarise}
                </Button>
              </div>
            ) : null}

            <SummaryBlock check={check} />
          </div>
        ) : null
      ) : null}
    </div>
  );
}
