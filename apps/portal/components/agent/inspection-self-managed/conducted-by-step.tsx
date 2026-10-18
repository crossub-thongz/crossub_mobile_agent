'use client';

import { useId, useState } from 'react';

import { AgencyInspectorSelect } from '@/components/agent/inspection-self-managed/agency-inspector-select';
import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { SELF_MANAGED_INSPECTION_COPY as COPY } from '@/constants/self-managed-inspections';
import type { SelfManagedInspectionRun } from '@/hooks/use-self-managed-inspection';
import {
  setInspectionConductedBy,
  type AgentInspectionDetail,
} from '@/lib/crossub-api/agent-inspection-client';

/** Who attends: the current agency inspector, and a picker to move the job before it is done. */
export function ConductedByStep({
  detail,
  canReassign,
  busy,
  run,
}: {
  detail: AgentInspectionDetail;
  canReassign: boolean;
  busy: boolean;
  run: SelfManagedInspectionRun;
}) {
  const id = useId();
  const [userId, setUserId] = useState('');
  const current = detail.conductedByName ?? COPY.unassigned;
  const canSubmit = Boolean(userId) && userId !== detail.conductedByUserId;

  const submit = async () => {
    const ok = await run(
      () => setInspectionConductedBy(detail.id, { userId }),
      COPY.inspectorChanged,
    );
    if (ok) setUserId('');
  };

  return (
    <StepCard title={COPY.conductedByTitle} hint={canReassign ? COPY.conductedByHint : undefined}>
      <p className="text-sm">
        <span className="text-muted-foreground">{COPY.conductedBy}: </span>
        <span className="font-medium">{current}</span>
      </p>
      {canReassign ? (
        <>
          <div>
            <FieldLabel htmlFor={`${id}-inspector`}>{COPY.changeInspector}</FieldLabel>
            <AgencyInspectorSelect
              id={`${id}-inspector`}
              agencyId={detail.agencyId}
              value={userId}
              onChange={setUserId}
              disabled={busy}
            />
          </div>
          <Button size="sm" disabled={busy || !canSubmit} onClick={() => void submit()}>
            {COPY.changeInspector}
          </Button>
        </>
      ) : null}
    </StepCard>
  );
}
