'use client';

import { useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  ESCALATION_OVERRIDE_REASON_OPTIONS,
  ESCALATION_RESOLUTION_ACTION,
  type EscalationOverrideReason,
  type EscalationResolutionAction,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  resolveMaintenanceEscalation,
  type AgentMaintenanceEscalation,
} from '@/lib/crossub-api/maintenance-client';
import { formatDateTime } from '@/lib/utils';

/**
 * Open escalations on a Self-Manage job: an overdue step, no tradie found, a quote over the
 * owner's limit. The agency is its own Account Manager, so it carries on, dismisses, or records
 * the decision it made by hand (which needs a reason and a note).
 */
export function EscalationStep({
  requestId,
  escalations,
  busy,
  run,
}: {
  requestId: string;
  escalations: readonly AgentMaintenanceEscalation[];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [overriding, setOverriding] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<EscalationOverrideReason>(
    ESCALATION_OVERRIDE_REASON_OPTIONS[0]!.value,
  );
  const [note, setNote] = useState('');

  const resolve = async (escalationId: string, action: EscalationResolutionAction) => {
    const isOverride = action === ESCALATION_RESOLUTION_ACTION.OVERRIDE;
    const ok = await run(
      () =>
        resolveMaintenanceEscalation(requestId, escalationId, {
          action,
          ...(isOverride ? { reasonCode, note: note.trim() } : {}),
        }),
      COPY.escalationResolved,
    );
    if (ok && isOverride) {
      setOverriding(null);
      setNote('');
    }
  };

  return (
    <StepCard title={COPY.escalationTitle} hint={COPY.escalationHint} tone="attention">
      <ul className="space-y-3">
        {escalations.map((escalation) => (
          <li key={escalation.id} className="space-y-2 rounded-md border border-border/70 p-2.5">
            <div>
              <p className="text-sm font-medium">
                {escalation.gateLabel} · {escalation.reasonLabel}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{escalation.detail}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {COPY.escalationRaised(formatDateTime(escalation.raisedAt))}
              </p>
            </div>

            {overriding === escalation.id ? (
              <div className="space-y-2">
                <div>
                  <FieldLabel htmlFor={`${id}-reason`}>{COPY.escalationReason}</FieldLabel>
                  <select
                    id={`${id}-reason`}
                    className={SELECT_CLASS}
                    value={reasonCode}
                    disabled={busy}
                    onChange={(e) => setReasonCode(e.target.value as EscalationOverrideReason)}
                  >
                    {ESCALATION_OVERRIDE_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-note`}>{COPY.escalationNote}</FieldLabel>
                  <Textarea
                    id={`${id}-note`}
                    value={note}
                    inputKind="message"
                    rows={2}
                    disabled={busy}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !note.trim()}
                    title={note.trim() ? undefined : COPY.escalationNoteRequired}
                    onClick={() => void resolve(escalation.id, ESCALATION_RESOLUTION_ACTION.OVERRIDE)}
                  >
                    {COPY.escalationSave}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setOverriding(null)}
                  >
                    {COPY.escalationCancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void resolve(escalation.id, ESCALATION_RESOLUTION_ACTION.PROCEED)}
                >
                  {COPY.escalationProceed}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void resolve(escalation.id, ESCALATION_RESOLUTION_ACTION.DISMISS)}
                >
                  {COPY.escalationDismiss}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setNote('');
                    setOverriding(escalation.id);
                  }}
                >
                  {COPY.escalationOverride}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </StepCard>
  );
}
