'use client';

import { useEffect, useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MAINTENANCE_SPLIT_PRIORITY_OPTIONS,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS,
  type MaintenanceSplitPriority,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  combineMaintenanceJob,
  fetchMaintenanceCombineCandidates,
  splitMaintenanceJob,
  type AgentMaintenanceCombineCandidate,
} from '@/lib/crossub-api/maintenance-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const DEFAULT_PRIORITY: MaintenanceSplitPriority = 'medium';

/** Split a second fault into its own job. */
export function SplitJobStep({
  requestId,
  busy,
  run,
}: {
  requestId: string;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenanceSplitPriority>(DEFAULT_PRIORITY);

  const submit = async () => {
    const ok = await run(
      () => splitMaintenanceJob(requestId, { description: description.trim(), priority }),
      COPY.splitDone,
    );
    if (ok) {
      setDescription('');
      setPriority(DEFAULT_PRIORITY);
    }
  };

  return (
    <StepCard title={COPY.splitTitle} hint={COPY.splitHint}>
      <div>
        <FieldLabel htmlFor={`${id}-description`}>{COPY.splitDescription}</FieldLabel>
        <Textarea
          id={`${id}-description`}
          rows={2}
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-priority`}>{COPY.priority}</FieldLabel>
        <select
          id={`${id}-priority`}
          className={SELECT_CLASS}
          value={priority}
          disabled={busy}
          onChange={(e) => setPriority(e.target.value as MaintenanceSplitPriority)}
        >
          {MAINTENANCE_SPLIT_PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={
          busy || description.trim().length < SELF_MANAGED_MAINTENANCE_LIMITS.splitDescriptionMin
        }
        onClick={() => void submit()}
      >
        {COPY.split}
      </Button>
    </StepCard>
  );
}

/**
 * Combine this job into another live job at the property. The server refuses (409) a combine
 * that disturbs commitments until the agent acknowledges them, so the checkbox is always shown.
 */
export function CombineJobStep({
  requestId,
  busy,
  run,
}: {
  requestId: string;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [candidates, setCandidates] = useState<AgentMaintenanceCombineCandidate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [intoRequestId, setIntoRequestId] = useState('');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMaintenanceCombineCandidates(requestId)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loadError) {
    return (
      <StepCard title={COPY.combineTitle}>
        <p className="text-destructive text-xs">{loadError}</p>
      </StepCard>
    );
  }
  if (candidates === null) return null;
  if (candidates.length === 0) {
    return (
      <StepCard title={COPY.combineTitle}>
        <p className="text-muted-foreground text-xs">{COPY.combineNone}</p>
      </StepCard>
    );
  }

  const submit = () =>
    run(
      () =>
        combineMaintenanceJob(requestId, {
          intoRequestId,
          ...(note.trim() ? { note: note.trim() } : {}),
          acknowledgeCommitments: acknowledged,
        }),
      COPY.combineDone,
    );

  return (
    <StepCard title={COPY.combineTitle} hint={COPY.combineHint}>
      <div>
        <FieldLabel htmlFor={`${id}-into`}>{COPY.combineInto}</FieldLabel>
        <select
          id={`${id}-into`}
          className={SELECT_CLASS}
          value={intoRequestId}
          disabled={busy}
          onChange={(e) => setIntoRequestId(e.target.value)}
        >
          <option value="" />
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.reference} · {c.subject}
              {c.alreadyQuoted ? ` (${COPY.alreadyQuoted})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-note`}>{COPY.combineNote}</FieldLabel>
        <Input
          id={`${id}-note`}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={acknowledged}
          disabled={busy}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        {COPY.combineAcknowledge}
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !intoRequestId}
        onClick={() => void submit()}
      >
        {COPY.combine}
      </Button>
    </StepCard>
  );
}
