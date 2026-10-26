'use client';

import { useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_RESPONSIBILITY_LABEL,
  MAINTENANCE_RESPONSIBILITY_OPTIONS,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
  type MaintenanceResponsibility,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  setSelfManagedResponsibility,
  type AgentMaintenanceDetail,
} from '@/lib/crossub-api/maintenance-client';

/**
 * Who pays for the repair, at any open stage: the party decided, or Cros's recommendation with a
 * one-click confirm, and a picker to set or change it. The server reopens the job to review for a
 * change and refuses one once a tradie is booked; its message is shown when it does.
 */
export function ResponsibilityStep({
  detail,
  busy,
  run,
}: {
  detail: AgentMaintenanceDetail;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const current = detail.responsibility;
  const recommendation = detail.responsibilityRecommendation;
  const [editing, setEditing] = useState(false);
  const [party, setParty] = useState<MaintenanceResponsibility | ''>('');
  const [reason, setReason] = useState('');

  const save = async (next: MaintenanceResponsibility, reasonText?: string) => {
    const ok = await run(
      () =>
        setSelfManagedResponsibility(detail.id, {
          responsibility: next,
          ...(reasonText ? { reasonText } : {}),
        }),
      COPY.responsibilitySaved,
    );
    if (ok) {
      setEditing(false);
      setReason('');
    }
  };

  const open = () => {
    setParty(current ?? recommendation?.determination ?? '');
    setReason('');
    setEditing(true);
  };

  return (
    <StepCard
      title={COPY.responsibilityTitle}
      tone={!current && recommendation ? 'attention' : 'default'}
    >
      <p className="text-sm">
        {current
          ? COPY.responsibilityCurrent(MAINTENANCE_RESPONSIBILITY_LABEL[current])
          : COPY.responsibilityNone}
      </p>
      {!current && recommendation ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            {COPY.responsibilityRecommended(
              MAINTENANCE_RESPONSIBILITY_LABEL[recommendation.determination],
              Math.round(recommendation.confidence),
            )}
            {recommendation.keyFactor ? ` ${recommendation.keyFactor}` : ''}
          </p>
          {!editing ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void save(recommendation.determination)}
            >
              {COPY.responsibilityConfirm(
                MAINTENANCE_RESPONSIBILITY_LABEL[recommendation.determination],
              )}
            </Button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-2">
          <div>
            <FieldLabel htmlFor={`${id}-party`}>{COPY.responsibilityParty}</FieldLabel>
            <select
              id={`${id}-party`}
              className={SELECT_CLASS}
              value={party}
              disabled={busy}
              onChange={(e) => setParty(e.target.value as MaintenanceResponsibility | '')}
            >
              <option value="" disabled>
                {COPY.responsibilityChoose}
              </option>
              {MAINTENANCE_RESPONSIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {MAINTENANCE_RESPONSIBILITY_LABEL[option]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-reason`}>{COPY.responsibilityReason}</FieldLabel>
            <Input
              id={`${id}-reason`}
              value={reason}
              maxLength={LIMITS.responsibilityReasonMax}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-muted-foreground text-[11px]">{COPY.responsibilityHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !party || party === current}
              onClick={() => party && void save(party, reason.trim() || undefined)}
            >
              {COPY.responsibilitySave}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={open}>
          {current ? COPY.responsibilityChange : COPY.responsibilityChoose}
        </Button>
      )}
    </StepCard>
  );
}
