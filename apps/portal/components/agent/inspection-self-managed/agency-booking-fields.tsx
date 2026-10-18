'use client';

import { useId } from 'react';

import { AgencyInspectorSelect } from '@/components/agent/inspection-self-managed/agency-inspector-select';
import { FieldLabel } from '@/components/agent/maintenance-self-managed/step-card';
import { Input } from '@/components/ui/input';
import {
  AGENCY_BOOKING_COPY as COPY,
  AGENCY_INSPECTION_TYPE,
  type AgencyInspectionType,
} from '@/constants/self-managed-inspections';

/**
 * "Conducted by" and the visit time for a Self-Manage booking with one of the agency's own
 * inspectors.
 *
 * CRS-0068 took the time and inspector away from the agent because CROSSUB runs those jobs.
 * On Self-Manage the agency runs them, so that rule is intentionally reversed here: the agent
 * names the inspector and sets the time, and the server checks the routine notice period.
 */
export function AgencyBookingFields({
  type,
  agencyId,
  conductedByUserId,
  onConductedByChange,
  scheduledLocal,
  onScheduledLocalChange,
  disabled = false,
}: {
  type: AgencyInspectionType;
  agencyId: string | null | undefined;
  conductedByUserId: string;
  onConductedByChange: (userId: string) => void;
  scheduledLocal: string;
  onScheduledLocalChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
      <div>
        <p className="text-sm font-semibold">{COPY.heading}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{COPY.hint}</p>
        {type === AGENCY_INSPECTION_TYPE.ROUTINE ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{COPY.routineNoticeHint}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${id}-when`}>{COPY.scheduledTime}</FieldLabel>
          <Input
            id={`${id}-when`}
            type="datetime-local"
            value={scheduledLocal}
            disabled={disabled}
            onChange={(e) => onScheduledLocalChange(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-inspector`}>{COPY.conductedBy}</FieldLabel>
          <AgencyInspectorSelect
            id={`${id}-inspector`}
            agencyId={agencyId}
            value={conductedByUserId}
            onChange={onConductedByChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
