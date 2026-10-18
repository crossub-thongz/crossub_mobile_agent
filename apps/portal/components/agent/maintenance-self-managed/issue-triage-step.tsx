'use client';

import { useId, useMemo, useState } from 'react';

import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  dismissMaintenanceIssue,
  recordMaintenanceAnswers,
  sendMaintenanceQuestions,
  type AgentMaintenanceIssue,
} from '@/lib/crossub-api/maintenance-client';
import { formatDateTime } from '@/lib/utils';

const answerKey = (issueId: string, questionKey: string) => `${issueId}:${questionKey}`;

/**
 * Issue triage: the faults picked out of the report, each with its tenant questions. The agent
 * dismisses what is not a fault, types in answers taken by phone, or emails the questions.
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

  const unanswered = useMemo(
    () => issues.some((i) => i.questions.some((q) => !q.answer?.trim())),
    [issues],
  );
  const neverAsked = issues.some((i) => !i.questionsSentAt && i.questions.length > 0);
  const typedAnswers = issues.flatMap((issue) =>
    issue.questions
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

  if (issues.length === 0) {
    return (
      <StepCard title={COPY.issuesTitle}>
        <p className="text-muted-foreground text-xs">{COPY.noIssues}</p>
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
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
                disabled={busy}
                onClick={() => {
                  setDismissing(dismissing === issue.id ? null : issue.id);
                  setDismissReason('');
                }}
              >
                {COPY.dismiss}
              </Button>
            </div>

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
                    ) : (
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

      {unanswered ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || typedAnswers.length === 0}
            onClick={() => void saveAnswers()}
          >
            {COPY.saveAnswers}
          </Button>
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
    </StepCard>
  );
}
