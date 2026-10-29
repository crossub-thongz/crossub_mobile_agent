import {
  AGENCY_BOOKING_COPY,
  AGENCY_INSPECTION_TYPE,
  AGENCY_INSPECTION_TYPES,
  ROUTINE_FLOW,
  SELF_MANAGED_CONDUCTOR,
  type AgencyInspectionType,
  type SelfManagedConductor,
} from '@/constants/self-managed-inspections';
import { propertyWallClockToIso } from '@/lib/utils/property-wall-clock';

/**
 * The type an agency inspector could conduct on this form, or null when only CROSSUB can. Self-Manage
 * only; ingoing, outgoing and in-person routine (a tenant self-inspection has no inspector to book).
 */
export function agencyBookableType(args: {
  selfManaged: boolean;
  type: string | null;
  routineFlow: string;
}): AgencyInspectionType | null {
  if (!args.selfManaged) return null;
  const type = AGENCY_INSPECTION_TYPES.find((t) => t === args.type) ?? null;
  if (type === AGENCY_INSPECTION_TYPE.ROUTINE && args.routineFlow !== ROUTINE_FLOW.IN_PERSON) {
    return null;
  }
  return type;
}

/**
 * The agency-conducted type a create-inspection form books, or null when the form keeps the
 * CROSSUB order path: not Self-Manage, not a bookable type, or the agent chose a CROSSUB
 * inspector for this job (a paid order).
 */
export function resolveAgencyBookingType(args: {
  selfManaged: boolean;
  type: string | null;
  routineFlow: string;
  conductor: SelfManagedConductor;
}): AgencyInspectionType | null {
  if (args.conductor === SELF_MANAGED_CONDUCTOR.CROSSUB) return null;
  return agencyBookableType(args);
}

/**
 * A `datetime-local` value, read as Sydney time like every other property time, as an ISO
 * instant; throws when it is missing or invalid.
 */
export function agencyScheduledTimeIso(local: string): string {
  if (!local.trim()) throw new Error(AGENCY_BOOKING_COPY.needTime);
  const iso = propertyWallClockToIso(local);
  if (!iso) throw new Error(AGENCY_BOOKING_COPY.invalidTime);
  return iso;
}
