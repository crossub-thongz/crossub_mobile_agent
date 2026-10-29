import { isPropertySelfManaged } from '@/lib/portal-service-level';
import type { Agency, Inspection, Property } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Routine, ingoing, outgoing and open jobs inside this window, and still unbooked, can be offered. */
export const SERVICE_RECOMMENDATION_HORIZON_DAYS = 14;
/** Inside this window CROS leads with Inspection Only. */
export const SERVICE_RECOMMENDATION_URGENT_DAYS = 3;
/** CROS summarises once at least this many inspections are waiting. */
export const SERVICE_RECOMMENDATION_BATCH_COUNT = 3;
export const SERVICE_RECOMMENDATION_SNOOZE_DAYS = 7;

export type ServiceRecommendationOffer = {
  id: string;
  propertyId: string;
  address: string;
  type: Inspection['type'];
  typeLabel: string;
  days: number;
  dueLabel: string;
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysUntil(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return Math.round((startOfDay(new Date(parsed)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

function isClosed(status: string | undefined): boolean {
  const value = (status ?? '').toLowerCase();
  return (
    value.includes('complete') ||
    value.includes('closed') ||
    value.includes('cancel') ||
    value.includes('deleted')
  );
}

function typeLabel(type: Inspection['type']): string {
  if (type === 'OPEN') return 'open inspection';
  if (type === 'INGOING') return 'ingoing inspection';
  if (type === 'OUTGOING') return 'outgoing inspection';
  return 'routine inspection';
}

function dueLabel(typeLabelText: string, days: number): string {
  const name = typeLabelText.charAt(0).toUpperCase() + typeLabelText.slice(1);
  if (days < 0) {
    const count = Math.abs(days);
    return `${name} is ${count} day${count === 1 ? '' : 's'} overdue and still not booked.`;
  }
  if (days === 0) return `${name} is due today and still not booked.`;
  if (days === 1) return `${name} is due in 1 day.`;
  return `${name} is due in ${days} days.`;
}

/**
 * Self-Manage inspections that are due within 14 days (or already overdue) and have no booking.
 * Full-service and inspection-only properties are left out — those agents already have a plan.
 */
export function buildServiceRecommendations(input: {
  now?: Date;
  inspections: Inspection[];
  properties: Property[];
  agencies: Agency[];
}): ServiceRecommendationOffer[] {
  const now = input.now ?? new Date();
  const agencyByProperty = new Map(input.properties.map((property) => [property.id, property.agencyId]));
  const offers: ServiceRecommendationOffer[] = [];

  for (const inspection of input.inspections) {
    if (isClosed(inspection.status) || inspection.scheduledAt) continue;
    if (!isPropertySelfManaged(input.agencies, agencyByProperty.get(inspection.propertyId))) continue;
    const due = inspection.nextDueDate || inspection.moveInDate;
    const days = daysUntil(due, now);
    if (days == null || days > SERVICE_RECOMMENDATION_HORIZON_DAYS) continue;
    const label = typeLabel(inspection.type);
    offers.push({
      id: inspection.id,
      propertyId: inspection.propertyId,
      address: inspection.propertyAddress,
      type: inspection.type,
      typeLabel: label,
      days,
      dueLabel: dueLabel(label, days),
    });
  }

  return offers.sort((a, b) => a.days - b.days);
}
