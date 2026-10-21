'use client';

import { useId, useMemo, useState } from 'react';

import {
  IssueForm,
  type IssueFormValues,
} from '@/components/agent/maintenance-self-managed/issue-form';
import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_ISSUE_TRADE_OPTIONS,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS,
  type MaintenanceIssueTrade,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  addMaintenanceIssue,
  dismissMaintenanceIssue,
  recordMaintenanceAnswers,
  rerunMaintenanceAiReview,
  sendMaintenanceQuestions,
  updateMaintenanceIssue,
  type AgentMaintenanceIssue,
  type UpdateMaintenanceIssueInput,
} from '@/lib/crossub-api/maintenance-client';
import { formatDateTime } from '@/lib/utils';

const answerKey = (issueId: string, questionKey: string) => `${issueId}:${questionKey}`;

const EMPTY_ISSUE: IssueFormValues = { description: '', location: '', trade: '' };

/** A trade the picker does not offer (free text, or a retired one) opens as "no trade set". */
function knownTrade(trade: string | null): MaintenanceIssueTrade | '' {
  return MAINTENANCE_ISSUE_TRADE_OPTIONS.find((option) => option === trade) ?? '';
}

function issueFormValues(issue: AgentMaintenanceIssue): IssueFormValues {
  return {
    description: issue.description,
    location: issue.location ?? '',
    trade: knownTrade(issue.trade),
  };
}

/** Only what the agent changed, so an untouched field is never recorded as a correction. */
function issueChanges(
  issue: AgentMaintenanceIssue,
  values: IssueFormValues,
): UpdateMaintenanceIssueInput {
  const before = issueFormValues(issue);
  return {
    ...(values.description !== before.description ? { description: values.description } : {}),
    ...(values.location !== before.location ? { location: values.location } : {}),
    ...(values.trade !== before.trade ? { trade: values.trade || null } : {}),
  };
}

/**
 * Issue triage: the faults picked out of the report, each with its tenant questions. The agent
 * corrects or dismisses a fault, adds one the AI missed, types in answers taken by phone, emails
 * the questions, or has the AI read the report again.
 */
export function IssueTriageStep({
  requestId,
  issues,
  busy,
  run,
}: {
  requestId: string;
  issues: readonly AgentMaintenanceIssue[];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Answers are recorded against a round that was emailed, so only a sent question takes one.
  const awaitingAnswers = useMemo(
    () => issues.some((i) => i.questionsSentAt && i.questions.some((q) => !q.answer?.trim())),
    [issues],
  );
  const neverAsked = issues.some((i) => !i.questionsSentAt && i.questions.length > 0);
  const typedAnswers = issues.flatMap((issue) =>
    (issue.questionsSentAt ? issue.questions : [])
      .map((q) => ({
        issueId: issue.id,
        questionKey: q.key,
        answer: (answers[answerKey(issue.id, q.key)] ?? '').trim(),
      }))
      .filter((a) => a.answer),
  );

  const saveAnswers = async () => {
    const ok = await run(
      () => recordMaintenanceAnswers(requestId, { answers: typedAnswers }),
      COPY.saved,
    );
    if (ok) setAnswers({});
  };

  const dismiss = async (issueId: string) => {
    const ok = await run(
      () => dismissMaintenanceIssue(requestId, issueId, { reasonText: dismissReason.trim() }),
      COPY.saved,
    );
    if (ok) {
      setDismissing(null);
      setDismissReason('');
    }
  };

  const saveIssue = (issue: AgentMaintenanceIssue, values: IssueFormValues) => {
    const changes = issueChanges(issue, values);
    if (Object.keys(changes).length === 0) return Promise.resolve(true);
    return run(() => updateMaintenanceIssue(requestId, issue.id, changes), COPY.saved);
  };

  const addIssue = (values: IssueFormValues) =>
    run(
      () =>
        addMaintenanceIssue(requestId, {
          description: values.description,
          ...(values.location ? { location: values.location } : {}),
          ...(values.trade ? { trade: values.trade } : {}),
        }),
      COPY.issueAdded,
    );

  const rerunAi = () => {
    if (!window.confirm(COPY.aiReviewConfirm)) return;
    void run(() => rerunMaintenanceAiReview(requestId), COPY.aiReviewDone);
  };

  const footer = (
    <div className="flex flex-wrap gap-2">
      {!adding ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setAdding(true)}>
          {COPY.issueAdd}
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" disabled={busy} onClick={rerunAi}>
        {COPY.aiReview}
      </Button>
    </div>
  );
  const addForm = adding ? (
    <IssueForm
      initial={EMPTY_ISSUE}
      submitLabel={COPY.issueAdd}
      busy={busy}
      onSubmit={addIssue}
      onCancel={() => setAdding(false)}
    />
  ) : null;

  if (issues.length === 0) {
    return (
      <StepCard title={COPY.issuesTitle}>
        <p className="text-muted-foreground text-xs">{COPY.noIssues}</p>
        {addForm}
        {footer}
      </StepCard>
    );
  }

  return (
    <StepCard title={COPY.issuesTitle}>
      <ol className="space-y-3">
        {issues.map((issue) => (
          <li key={issue.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm leading-snug">
                <span className="text-muted-foreground mr-1 tabular-nums">{issue.sequenceNo}.</span>
                {issue.description}
                {issue.location ? (
                  <span className="text-muted-foreground"> · {issue.location}</span>
                ) : null}
              </p>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={busy}
                  onClick={() => setEditing(editing === issue.id ? null : issue.id)}
                >
                  {COPY.issueEdit}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setDismissing(dismissing === issue.id ? null : issue.id);
                    setDismissReason('');
                  }}
                >
                  {COPY.dismiss}
                </Button>
              </div>
            </div>

            {editing === issue.id ? (
              <IssueForm
                initial={issueFormValues(issue)}
                submitLabel={COPY.issueSave}
                busy={busy}
                onSubmit={(values) => saveIssue(issue, values)}
                onCancel={() => setEditing(null)}
              />
            ) : null}

            {dismissing === issue.id ? (
              <div className="flex gap-2">
                <Input
                  aria-label={COPY.dismissPrompt}
                  placeholder={COPY.dismissPrompt}
                  value={dismissReason}
                  disabled={busy}
                  onChange={(e) => setDismissReason(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={
                    busy ||
                    dismissReason.trim().length < SELF_MANAGED_MAINTENANCE_LIMITS.dismissReasonMin
                  }
                  onClick={() => void dismiss(issue.id)}
                >
                  {COPY.dismissConfirm}
                </Button>
              </div>
            ) : null}

            {issue.questions.length > 0 ? (
              <ul className="border-border/60 space-y-1.5 border-l pl-3">
                {issue.questions.map((q) => (
                  <li key={q.key} className="space-y-1">
                    <p className="text-muted-foreground text-xs">{q.question}</p>
                    {q.answer?.trim() ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">{COPY.answered}: </span>
                        {q.answer}
                      </p>
                    ) : !issue.questionsSentAt ? null : (
                      <Input
                        id={`${id}-${issue.id}-${q.key}`}
                        aria-label={q.question}
                        placeholder={COPY.answerPlaceholder}
                        className="h-8 text-xs"
                        value={answers[answerKey(issue.id, q.key)] ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [answerKey(issue.id, q.key)]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </li>
                ))}
                {issue.questionsSentAt ? (
                  <li className="text-muted-foreground text-[11px]">
                    {COPY.questionsSent(formatDateTime(issue.questionsSentAt))}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {awaitingAnswers || neverAsked ? (
        <div className="flex flex-wrap gap-2">
          {awaitingAnswers ? (
            <Button
              size="sm"
              disabled={busy || typedAnswers.length === 0}
              onClick={() => void saveAnswers()}
            >
              {COPY.saveAnswers}
            </Button>
          ) : null}
          {neverAsked ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => sendMaintenanceQuestions(requestId, {}), COPY.saved)}
            >
              {COPY.sendQuestions}
            </Button>
          ) : null}
        </div>
      ) : null}
      {addForm}
      {footer}
    </StepCard>
  );
}
