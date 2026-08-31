'use client';

import { AlertTriangle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MaintenanceIssueTypeField } from '@/components/maintenance/maintenance-issue-type-field';
import { MaintenanceMediaUploadField } from '@/components/maintenance/maintenance-media-upload-field';
import { isTenantUrgentEligibleMaintenanceIssueType } from '@/constants/maintenance-issue-types';
import { cn } from '@/lib/utils';

export type MaintenanceJobPriority = 'urgent' | 'normal';

/** Matches API `CreateStaffMaintenanceRequestDto` description `@MinLength(5)`. */
export const MAINTENANCE_DESCRIPTION_MIN_CHARS = 5;

export function MaintenanceNewJobFormFields({
  address,
  propertyId,
  issueTypeSelection,
  issueTypeOther,
  onIssueTypeSelectionChange,
  onIssueTypeOtherChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  urgentReason,
  onUrgentReasonChange,
  tenantName,
  onTenantNameChange,
  tenantEmail,
  onTenantEmailChange,
  tenantPhone,
  onTenantPhoneChange,
  mediaUrls,
  onMediaUrlsChange,
  disabled = false,
}: {
  address: string;
  propertyId: string;
  issueTypeSelection: string;
  issueTypeOther: string;
  onIssueTypeSelectionChange: (value: string) => void;
  onIssueTypeOtherChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  priority: MaintenanceJobPriority;
  onPriorityChange: (value: MaintenanceJobPriority) => void;
  urgentReason: string;
  onUrgentReasonChange: (value: string) => void;
  tenantName: string;
  onTenantNameChange: (value: string) => void;
  tenantEmail: string;
  onTenantEmailChange: (value: string) => void;
  tenantPhone: string;
  onTenantPhoneChange: (value: string) => void;
  mediaUrls: string[];
  onMediaUrlsChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const tenantIncomplete =
    !(tenantName.trim() && tenantEmail.trim() && tenantPhone.trim());
  const urgentEligible = isTenantUrgentEligibleMaintenanceIssueType(issueTypeSelection);
  const priorityOptions: MaintenanceJobPriority[] = urgentEligible
    ? ['urgent', 'normal']
    : ['normal'];
  const showUrgentReason =
    !urgentEligible && issueTypeSelection && priority === 'urgent';

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
          minLength={MAINTENANCE_DESCRIPTION_MIN_CHARS}
        />
        {description.trim().length > 0 &&
        description.trim().length < MAINTENANCE_DESCRIPTION_MIN_CHARS ? (
          <p className="text-destructive text-[11px]">
            Description must be at least {MAINTENANCE_DESCRIPTION_MIN_CHARS} characters
          </p>
        ) : (
          <p className="text-muted-foreground text-[11px]">
            At least {MAINTENANCE_DESCRIPTION_MIN_CHARS} characters
          </p>
        )}
      </div>

      <MaintenanceMediaUploadField
        propertyId={propertyId}
        photos={mediaUrls}
        onPhotosChange={onMediaUrlsChange}
        disabled={disabled}
      />

      <div>
        <Label className="text-xs">Urgency</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {priorityOptions.map((level) => (
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
          {!urgentEligible && issueTypeSelection ? (
            <Button
              type="button"
              size="sm"
              variant={priority === 'urgent' ? 'destructive' : 'outline'}
              disabled={disabled}
              className="h-8 text-xs"
              onClick={() => onPriorityChange('urgent')}
            >
              Request urgent
            </Button>
          ) : null}
        </div>
        {issueTypeSelection && !urgentEligible ? (
          <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">
            Urgent is immediate for flooding, locksmith, electrical, and hot water repairs.
            For other issues, use Request urgent and explain why — admin will confirm.
          </p>
        ) : null}
        {showUrgentReason ? (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="property-mj-urgent-reason" className="text-xs">
              Reason for urgent request *
            </Label>
            <Textarea
              id="property-mj-urgent-reason"
              value={urgentReason}
              onChange={(e) => onUrgentReasonChange(e.target.value)}
              rows={3}
              placeholder="Why does this need urgent attention?"
              disabled={disabled}
            />
          </div>
        ) : null}
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
