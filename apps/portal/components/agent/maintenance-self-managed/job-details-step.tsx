'use client';

import { useId, useState } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { MaintenanceIssueTypeField } from '@/components/maintenance/maintenance-issue-type-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  MAINTENANCE_ISSUE_TYPE_OTHER,
  parseMaintenanceIssueType,
} from '@/constants/maintenance-issue-types';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
} from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  updateMaintenanceJob,
  type AgentMaintenanceDetail,
  type UpdateMaintenanceJobInput,
} from '@/lib/crossub-api/maintenance-client';
import { splitAgentMaintenanceDescription } from '@/lib/maintenance/maintenance-description';

/**
 * Correct the job after intake: its issue type, the description and whether it is urgent. Only
 * changed fields are sent; the server keeps the description's "Issue type:" prefix in step.
 */
export function JobDetailsStep({
  detail,
  busy,
  run,
}: {
  detail: AgentMaintenanceDetail;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const parsed = splitAgentMaintenanceDescription(detail.description);
  const initialType = detail.categoryName?.trim() || parsed.issueType;
  const [editing, setEditing] = useState(false);
  const [typeSelection, setTypeSelection] = useState('');
  const [typeOther, setTypeOther] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);

  const open = () => {
    const type = parseMaintenanceIssueType(initialType);
    setTypeSelection(type.selection);
    setTypeOther(type.otherDetail);
    setDescription(parsed.body);
    setUrgent(detail.urgent);
    setEditing(true);
  };

  const issueType = (
    typeSelection === MAINTENANCE_ISSUE_TYPE_OTHER ? typeOther : typeSelection
  ).trim();
  const body = description.trim();
  const changes: UpdateMaintenanceJobInput = {
    ...(issueType && issueType !== initialType ? { issueType } : {}),
    ...(body !== parsed.body ? { description: body } : {}),
    ...(urgent !== detail.urgent ? { urgent } : {}),
  };
  const hasChanges = Object.keys(changes).length > 0;
  const bodyValid = body.length >= LIMITS.jobDescriptionMin;

  const save = async () => {
    const ok = await run(() => updateMaintenanceJob(detail.id, changes), COPY.jobSaved);
    if (ok) setEditing(false);
  };

  if (!editing) {
    return (
      <StepCard title={COPY.jobTitle}>
        <p className="text-sm leading-snug">
          {initialType ? <span className="font-medium">{initialType}: </span> : null}
          {parsed.body || '—'}
        </p>
        <Button size="sm" variant="outline" disabled={busy} onClick={open}>
          {COPY.jobEdit}
        </Button>
      </StepCard>
    );
  }

  return (
    <StepCard title={COPY.jobTitle}>
      <MaintenanceIssueTypeField
        id={`${id}-type`}
        selection={typeSelection}
        otherDetail={typeOther}
        onSelectionChange={setTypeSelection}
        onOtherDetailChange={setTypeOther}
        disabled={busy}
        required={false}
      />
      <div>
        <FieldLabel htmlFor={`${id}-description`}>{COPY.jobDescription}</FieldLabel>
        <Textarea
          id={`${id}-description`}
          rows={3}
          maxLength={LIMITS.jobDescriptionMax}
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={urgent}
          disabled={busy}
          onChange={(e) => setUrgent(e.target.checked)}
        />
        {COPY.jobUrgent}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !hasChanges || !bodyValid} onClick={() => void save()}>
          {COPY.jobSave}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
          {COPY.cancel}
        </Button>
      </div>
    </StepCard>
  );
}
