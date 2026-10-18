'use client';

import { useEffect, useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  URGENT_DECISION,
  URGENT_DECISION_OPTIONS,
  URGENT_WORK_DECISIONS,
  type UrgentDecision,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import { fetchPreferredContractors, type PreferredContractor } from '@/lib/crossub-api/agent-client';
import { authoriseUrgentMaintenance } from '@/lib/crossub-api/maintenance-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Urgent triage: confirm and send a tradie under a spending limit, or route it elsewhere. */
export function UrgentDecisionStep({
  requestId,
  agencyId,
  busy,
  run,
}: {
  requestId: string;
  agencyId: string | null;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [decision, setDecision] = useState<UrgentDecision>(URGENT_DECISION.CONFIRM_URGENT);
  const [contractorId, setContractorId] = useState('');
  const [scope, setScope] = useState('');
  const [limit, setLimit] = useState('');
  const [reason, setReason] = useState('');
  const [tradies, setTradies] = useState<PreferredContractor[]>([]);
  const [tradieError, setTradieError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    fetchPreferredContractors(agencyId)
      .then((rows) => {
        if (!cancelled) setTradies(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTradieError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  const work = URGENT_WORK_DECISIONS.includes(decision);
  const limitValue = Number(limit);
  const canSubmit = work
    ? Boolean(contractorId && scope.trim() && limitValue > 0)
    : Boolean(reason.trim());

  const submit = () =>
    run(
      () =>
        authoriseUrgentMaintenance(requestId, {
          decision,
          scope: scope.trim() || reason.trim(),
          ...(work ? { contractorId, spendingLimit: limitValue } : { reason: reason.trim() }),
        }),
      COPY.urgentDecided,
    );

  return (
    <StepCard title={COPY.urgentTitle} hint={COPY.urgentHint} tone="attention">
      <div>
        <FieldLabel htmlFor={`${id}-decision`}>{COPY.decision}</FieldLabel>
        <select
          id={`${id}-decision`}
          className={SELECT_CLASS}
          value={decision}
          disabled={busy}
          onChange={(e) => setDecision(e.target.value as UrgentDecision)}
        >
          {URGENT_DECISION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {work ? (
        <>
          <div>
            <FieldLabel htmlFor={`${id}-tradie`}>{COPY.tradie}</FieldLabel>
            <select
              id={`${id}-tradie`}
              className={SELECT_CLASS}
              value={contractorId}
              disabled={busy || tradies.length === 0}
              onChange={(e) => setContractorId(e.target.value)}
            >
              <option value="">{COPY.chooseTradie}</option>
              {tradies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {tradieError ? (
              <p className="text-destructive mt-1 text-xs">{tradieError}</p>
            ) : tradies.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">{COPY.noPreferredTradies}</p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-scope`}>{COPY.scope}</FieldLabel>
            <Textarea
              id={`${id}-scope`}
              rows={2}
              value={scope}
              disabled={busy}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-limit`}>{COPY.spendingLimit}</FieldLabel>
            <Input
              id={`${id}-limit`}
              type="number"
              min={1}
              inputMode="decimal"
              value={limit}
              disabled={busy}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div>
          <FieldLabel htmlFor={`${id}-reason`}>{COPY.reason}</FieldLabel>
          <Textarea
            id={`${id}-reason`}
            rows={2}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}

      <Button size="sm" disabled={busy || !canSubmit} onClick={() => void submit()}>
        {COPY.recordDecision}
      </Button>
    </StepCard>
  );
}
