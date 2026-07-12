import { addDays, format } from 'date-fns';

import type { Property, VacatingCase } from '@/lib/types';

export const OUTGOING_INSPECTION_DAYS_AFTER_VACATE = 3;

export function suggestedOutgoingInspectionIsoFromDate(anchor?: string | null): string {
  if (!anchor?.trim()) {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  const d = addDays(new Date(`${anchor.slice(0, 10)}T09:00:00`), OUTGOING_INSPECTION_DAYS_AFTER_VACATE);
  if (Number.isNaN(d.getTime())) {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  if (d.getTime() < Date.now()) {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  return d.toISOString();
}

export function suggestedOutgoingInspectionIso(vacatingCase: VacatingCase): string {
  const anchor = vacatingCase.vacateDate?.slice(0, 10);
  if (!anchor) return '';
  return suggestedOutgoingInspectionIsoFromDate(anchor);
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultOpenInspectionSchedule(property?: Property, availableFrom?: string): string {
  const base = availableFrom
    ? new Date(`${availableFrom.slice(0, 10)}T11:00:00`)
    : addDays(new Date(), 7);
  if (Number.isNaN(base.getTime())) {
    const fallback = addDays(new Date(), 7);
    fallback.setHours(11, 0, 0, 0);
    return fallback.toISOString().slice(0, 19);
  }
  base.setHours(11, 0, 0, 0);
  return base.toISOString().slice(0, 19);
}

export function defaultRoutineScheduledDate(): string {
  return format(addDays(new Date(), 14), 'yyyy-MM-dd');
}
