'use client';

import { useId, useState } from 'react';

import { FieldLabel } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  sendMaintenanceQuestions,
  type AgentMaintenanceIssue,
} from '@/lib/crossub-api/maintenance-client';
import { askableIssueQuestions } from '@/lib/maintenance/maintenance-issue-questions';

const pickKey = (issueId: string, questionKey: string) => `${issueId}:${questionKey}`;

/**
 * One tenant question round, as staff Maintenance sends it: the suggested questions not emailed
 * yet (all ticked to start), plus the agent's own. The request always names the picks, so
 * unticking every suggestion sends none of them.
 */
export function AskTenantForm({
  requestId,
  issues,
  busy,
  run,
  onDone,
}: {
  requestId: string;
  issues: readonly AgentMaintenanceIssue[];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
  onDone: () => void;
}) {
  const id = useId();
  const askable = askableIssueQuestions(issues);
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(askable.flatMap(({ issue, questions }) => questions.map((q) => pickKey(issue.id, q.key)))),
  );
  const [extraText, setExtraText] = useState('');

  const extras = extraText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const extrasValid =
    extras.length <= LIMITS.extraQuestionsMax &&
    extras.every((q) => q.length <= LIMITS.extraQuestionMax);
  const questions = askable.flatMap(({ issue, questions: qs }) =>
    qs.filter((q) => picked.has(pickKey(issue.id, q.key))).map((q) => ({ issueId: issue.id, key: q.key })),
  );

  const toggle = (key: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const send = async () => {
    const ok = await run(
      () => sendMaintenanceQuestions(requestId, { questions, extraQuestions: extras }),
      COPY.questionsEmailed,
    );
    if (ok) onDone();
  };

  return (
    <div className="border-border/60 space-y-2.5 rounded-md border p-2.5">
      <p className="text-muted-foreground text-xs">
        {askable.length > 0 ? COPY.askTenantHint : COPY.askTenantNoSuggested}
      </p>
      {askable.map(({ issue, questions: qs }) => (
        <div key={issue.id} className="space-y-1">
          <p className="text-xs font-medium">
            <span className="text-muted-foreground mr-1 tabular-nums">{issue.sequenceNo}.</span>
            {issue.description}
          </p>
          {qs.map((q) => {
            const key = pickKey(issue.id, q.key);
            return (
              <label key={key} className="flex items-start gap-2 pl-4 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={picked.has(key)}
                  disabled={busy}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                {q.question}
              </label>
            );
          })}
        </div>
      ))}
      <div>
        <FieldLabel htmlFor={`${id}-extra`}>{COPY.extraQuestions}</FieldLabel>
        <Textarea
          id={`${id}-extra`}
          rows={3}
          value={extraText}
          disabled={busy}
          onChange={(e) => setExtraText(e.target.value)}
        />
        <p
          className={
            extrasValid ? 'text-muted-foreground text-[11px]' : 'text-destructive text-[11px]'
          }
        >
          {COPY.extraQuestionsLimit(LIMITS.extraQuestionsMax, LIMITS.extraQuestionMax)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !extrasValid || (questions.length === 0 && extras.length === 0)}
          onClick={() => void send()}
        >
          {COPY.sendQuestions}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDone}>
          {COPY.cancel}
        </Button>
      </div>
    </div>
  );
}
