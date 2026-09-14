'use client';

import { Label } from '@/components/ui/label';
import { LEASING_RELET_COPY } from '@/constants/leasing-relet-decision';
import { useAgencyTeamMembers } from '@/hooks/use-agency-team-members';
import { cn } from '@/lib/utils';
import { agencyTeamMemberLabel } from '@/utils/leasing-relet-decision';

const SELECT_CLASS =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';

/** Required "Default inspector" picker — a member of the property's agency team. */
export function LeasingDefaultInspectorField({
  id = 'leasing-default-inspector',
  agencyId,
  value,
  onChange,
  enabled = true,
  disabled = false,
  className,
}: {
  id?: string;
  agencyId: string | null | undefined;
  value: string;
  onChange: (userId: string) => void;
  /** Load the team only while the field is actually shown. */
  enabled?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { members, loading, failed } = useAgencyTeamMembers(agencyId, enabled);
  const hint = loading
    ? LEASING_RELET_COPY.inspectorLoading
    : failed || !agencyId
      ? LEASING_RELET_COPY.inspectorLoadFailed
      : members.length === 0
        ? LEASING_RELET_COPY.inspectorEmpty
        : null;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs">
        {LEASING_RELET_COPY.inspectorLabel} *
      </Label>
      <select
        id={id}
        className={SELECT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || members.length === 0}
      >
        <option value="">{LEASING_RELET_COPY.inspectorPlaceholder}</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {agencyTeamMemberLabel(member)}
          </option>
        ))}
      </select>
      {hint ? <p className="text-muted-foreground text-[11px]">{hint}</p> : null}
    </div>
  );
}
