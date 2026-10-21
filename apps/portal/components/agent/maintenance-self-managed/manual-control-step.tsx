'use client';

import { useId, useState } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  resumeMaintenanceAutomation,
  takeMaintenanceControl,
  type AgentMaintenanceManualControl,
} from '@/lib/crossub-api/maintenance-client';
import { formatDateTime } from '@/lib/utils';

/**
 * Take the job out of the system's hands (no chasers, no automatic steps) or hand it back. The
 * same hold a CROSSUB Account Manager places from staff Maintenance.
 */
export function ManualControlStep({
  requestId,
  manualControl,
  busy,
  run,
}: {
  requestId: string;
  manualControl: AgentMaintenanceManualControl | null;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [taking, setTaking] = useState(false);
  const [reason, setReason] = useState('');

  if (manualControl) {
    return (
      <StepCard
        title={COPY.manualTitle}
        hint={COPY.manualHeldHint(formatDateTime(manualControl.heldAt))}
        tone="attention"
      >
        {manualControl.note ? (
          <p className="text-muted-foreground text-xs">{manualControl.note}</p>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(() => resumeMaintenanceAutomation(requestId), COPY.automationResumed)
          }
        >
          {COPY.resumeAutomation}
        </Button>
      </StepCard>
    );
  }

  const take = async () => {
    const ok = await run(
      () => takeMaintenanceControl(requestId, { reason: reason.trim() }),
      COPY.controlTaken,
    );
    if (ok) {
      setTaking(false);
      setReason('');
    }
  };

  return (
    <StepCard title={COPY.manualTitle} hint={COPY.manualAutoHint}>
      {taking ? (
        <div className="space-y-2">
          <div>
            <FieldLabel htmlFor={`${id}-reason`}>{COPY.manualReason}</FieldLabel>
            <Input
              id={`${id}-reason`}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={
                busy || reason.trim().length < SELF_MANAGED_MAINTENANCE_LIMITS.takeControlReasonMin
              }
              onClick={() => void take()}
            >
              {COPY.takeControl}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setTaking(false)}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setTaking(true)}>
          {COPY.takeControl}
        </Button>
      )}
    </StepCard>
  );
}
