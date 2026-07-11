'use client';

import { AlertTriangle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MaintenanceIssueTypeField } from '@/components/maintenance/maintenance-issue-type-field';
import { cn } from '@/lib/utils';

export type MaintenanceJobPriority = 'urgent' | 'normal';

export function MaintenanceNewJobFormFields({
  address,
  issueTypeSelection,
  issueTypeOther,
  onIssueTypeSelectionChange,
  onIssueTypeOtherChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  tenantName,
  onTenantNameChange,
  tenantEmail,
  onTenantEmailChange,
  tenantPhone,
  onTenantPhoneChange,
  disabled = false,
}: {
  address: string;
  issueTypeSelection: string;
  issueTypeOther: string;
  onIssueTypeSelectionChange: (value: string) => void;
  onIssueTypeOtherChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  priority: MaintenanceJobPriority;
  onPriorityChange: (value: MaintenanceJobPriority) => void;
  tenantName: string;
  onTenantNameChange: (value: string) => void;
  tenantEmail: string;
  onTenantEmailChange: (value: string) => void;
  tenantPhone: string;
  onTenantPhoneChange: (value: string) => void;
  disabled?: boolean;
}) {
  const tenantIncomplete =
    !(tenantName.trim() && tenantEmail.trim() && tenantPhone.trim());

  return (
    <div className="space-y-4">
      {address ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Address
          </p>
          <p className="bg-muted/40 rounded-md px-3 py-2 text-sm">{address}</p>
        </div>
      ) : null}

      <MaintenanceIssueTypeField
        id="property-mj-issue"
        selection={issueTypeSelection}
        otherDetail={issueTypeOther}
        onSelectionChange={onIssueTypeSelectionChange}
        onOtherDetailChange={onIssueTypeOtherChange}
        disabled={disabled}
      />

      <div className="space-y-1.5">
        <Label htmlFor="property-mj-desc" className="text-xs">
          Description *
        </Label>
        <Textarea
          id="property-mj-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          placeholder="What's happening? Any constraints or notes?"
          disabled={disabled}
        />
      </div>

      <div>
        <Label className="text-xs">Urgency</Label>
        <div className="mt-2 flex gap-2">
          {(['urgent', 'normal'] as MaintenanceJobPriority[]).map((level) => (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onPriorityChange(level)}
              className={cn(
                'rounded-md border px-4 py-1.5 text-xs font-medium capitalize transition-colors',
                priority === level
                  ? level === 'urgent'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary',
                disabled && 'opacity-50',
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-background p-3">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Tenant contact{' '}
          <span className="font-normal text-muted-foreground/70">(required for status tracking)</span>
        </p>
        <div className="mt-2 space-y-2">
          <Input
            value={tenantName}
            onChange={(e) => onTenantNameChange(e.target.value)}
            placeholder="Full name"
            disabled={disabled}
          />
          <Input
            type="email"
            value={tenantEmail}
            onChange={(e) => onTenantEmailChange(e.target.value)}
            placeholder="Email"
            disabled={disabled}
          />
          <Input
            value={tenantPhone}
            onChange={(e) => onTenantPhoneChange(e.target.value)}
            placeholder="Phone"
            disabled={disabled}
          />
        </div>
        {tenantIncomplete ? (
          <p className="text-amber-600 mt-2 flex items-center gap-1 text-[11px] dark:text-amber-400">
            <AlertTriangle className="size-3 shrink-0" />
            Incomplete contact → job flagged as &quot;Pending More Details from Tenant&quot;
          </p>
        ) : null}
      </div>
    </div>
  );
}
