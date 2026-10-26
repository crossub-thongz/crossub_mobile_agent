'use client';

import { useId, useState } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { MaintenanceIssueTypeField } from '@/components/maintenance/maintenance-issue-type-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { isEmailAddress } from '@/utils/email-recipients';

type TenantFields = { name: string; email: string; phone: string };

/** Only the tenant fields the agent changed, or nothing when none were. */
function tenantChanges(
  before: TenantFields,
  after: TenantFields,
): NonNullable<UpdateMaintenanceJobInput['tenant']> | null {
  const changed = {
    ...(after.name !== before.name ? { name: after.name } : {}),
    ...(after.email !== before.email ? { email: after.email } : {}),
    ...(after.phone !== before.phone ? { phone: after.phone } : {}),
  };
  return Object.keys(changed).length > 0 ? changed : null;
}

/**
 * Correct the job after intake: its issue type, the description, whether it is urgent, and the
 * tenant contact the job writes to. Only changed fields are sent; the server keeps the
 * description's "Issue type:" prefix in step. The tenant edit is the job's own copy; the
 * property's tenant record is not changed.
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
  const initialTenant: TenantFields = {
    name: detail.jobTenant?.name ?? '',
    email: detail.jobTenant?.email ?? '',
    phone: detail.jobTenant?.phone ?? '',
  };
  const [tenant, setTenant] = useState<TenantFields>(initialTenant);

  const open = () => {
    const type = parseMaintenanceIssueType(initialType);
    setTypeSelection(type.selection);
    setTypeOther(type.otherDetail);
    setDescription(parsed.body);
    setUrgent(detail.urgent);
    setTenant(initialTenant);
    setEditing(true);
  };

  const issueType = (
    typeSelection === MAINTENANCE_ISSUE_TYPE_OTHER ? typeOther : typeSelection
  ).trim();
  const body = description.trim();
  const trimmedTenant: TenantFields = {
    name: tenant.name.trim(),
    email: tenant.email.trim(),
    phone: tenant.phone.trim(),
  };
  const tenantPatch = tenantChanges(initialTenant, trimmedTenant);
  const changes: UpdateMaintenanceJobInput = {
    ...(issueType && issueType !== initialType ? { issueType } : {}),
    ...(body !== parsed.body ? { description: body } : {}),
    ...(urgent !== detail.urgent ? { urgent } : {}),
    ...(tenantPatch ? { tenant: tenantPatch } : {}),
  };
  const hasChanges = Object.keys(changes).length > 0;
  const bodyValid = body.length >= LIMITS.jobDescriptionMin;
  const tenantEmailValid = !trimmedTenant.email || isEmailAddress(trimmedTenant.email);

  const save = async () => {
    const ok = await run(() => updateMaintenanceJob(detail.id, changes), COPY.jobSaved);
    if (ok) setEditing(false);
  };

  if (!editing) {
    const contact = detail.jobTenant;
    return (
      <StepCard title={COPY.jobTitle}>
        <p className="text-sm leading-snug">
          {initialType ? <span className="font-medium">{initialType}: </span> : null}
          {parsed.body || '—'}
        </p>
        <p className="text-muted-foreground text-xs">
          {contact
            ? [contact.name, contact.email, contact.phone].filter(Boolean).join(' · ')
            : COPY.jobTenantNone}
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
      <fieldset className="space-y-2">
        <legend className="text-muted-foreground mb-1 text-xs font-medium">
          {COPY.jobTenantTitle}
        </legend>
        <div>
          <FieldLabel htmlFor={`${id}-tenant-name`}>{COPY.jobTenantName}</FieldLabel>
          <Input
            id={`${id}-tenant-name`}
            value={tenant.name}
            maxLength={LIMITS.tenantNameMax}
            disabled={busy}
            onChange={(e) => setTenant((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel htmlFor={`${id}-tenant-email`}>{COPY.jobTenantEmail}</FieldLabel>
            <Input
              id={`${id}-tenant-email`}
              type="email"
              value={tenant.email}
              maxLength={LIMITS.tenantEmailMax}
              disabled={busy}
              aria-invalid={!tenantEmailValid}
              onChange={(e) => setTenant((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-tenant-phone`}>{COPY.jobTenantPhone}</FieldLabel>
            <Input
              id={`${id}-tenant-phone`}
              type="tel"
              value={tenant.phone}
              maxLength={LIMITS.tenantPhoneMax}
              disabled={busy}
              onChange={(e) => setTenant((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !hasChanges || !bodyValid || !tenantEmailValid}
          onClick={() => void save()}
        >
          {COPY.jobSave}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
          {COPY.cancel}
        </Button>
      </div>
    </StepCard>
  );
}
