'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { ROUTES } from '@/constants/routes';
import { SELF_MANAGED_INSPECTION_COPY as COPY } from '@/constants/self-managed-inspections';
import { useAgencyTeamMembers } from '@/hooks/use-agency-team-members';
import { agencyTeamMemberLabel } from '@/utils/leasing-relet-decision';

/**
 * Picker over the agency's active inspectors (team members marked as inspectors). With none, it
 * says so and links to the Team page, where a principal can make a team member an inspector.
 */
export function AgencyInspectorSelect({
  id,
  agencyId,
  value,
  onChange,
  disabled = false,
  enabled = true,
}: {
  id: string;
  agencyId: string | null | undefined;
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  /** Load the team only while the picker is actually shown. */
  enabled?: boolean;
}) {
  const { members, loading, failed } = useAgencyTeamMembers(agencyId, enabled);
  const inspectors = useMemo(() => members.filter((m) => m.isAgencyInspector), [members]);
  const none = !loading && !failed && inspectors.length === 0;

  return (
    <div>
      <select
        id={id}
        className={SELECT_CLASS}
        value={value}
        disabled={disabled || loading || inspectors.length === 0}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{COPY.chooseInspector}</option>
        {inspectors.map((member) => (
          <option key={member.userId} value={member.userId}>
            {agencyTeamMemberLabel(member)}
          </option>
        ))}
      </select>
      {failed || !agencyId ? (
        <p className="text-destructive mt-1 text-xs">{COPY.inspectorsLoadFailed}</p>
      ) : none ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {COPY.noInspectors}{' '}
          <Link href={ROUTES.TEAM} className="text-primary font-medium underline">
            {COPY.addInspectorLink}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
