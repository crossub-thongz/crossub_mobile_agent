import {
  AGENCY_BOOKING_COPY,
  AGENCY_INSPECTION_TYPE,
  AGENCY_INSPECTION_TYPES,
  ROUTINE_FLOW,
  type AgencyInspectionType,
} from '@/constants/self-managed-inspections';

/**
 * The agency-conducted type a create-inspection form books, or null when the form keeps the
 * CROSSUB order path. Self-Manage only; ingoing, outgoing and in-person routine (a tenant
 * self-inspection has no inspector to book).
 */
export function resolveAgencyBookingType(args: {
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

/** A `datetime-local` value as an ISO instant; throws when it is missing or invalid. */
export function agencyScheduledTimeIso(local: string): string {
  if (!local.trim()) throw new Error(AGENCY_BOOKING_COPY.needTime);
  const when = new Date(local);
  if (Number.isNaN(when.getTime())) throw new Error(AGENCY_BOOKING_COPY.invalidTime);
  return when.toISOString();
}
