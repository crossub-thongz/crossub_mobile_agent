'use client';

import {
  workflowCaseReferenceLabel,
  type WorkflowCaseRefKind,
} from '@/lib/workflow-case-reference';

const STORAGE_KEY = 'crossub:agent-portal-recent-cases';
export const MAX_RECENT_CASES = 5;

export type RecentCaseModule =
  | 'maintenance'
  | 'inspection'
  | 'rent_review'
  | 'leasing'
  | 'end_leasing'
  | 'tribunal';

export type RecentCaseVisit = {
  id: string;
  label: string;
  href: string;
  module: RecentCaseModule;
};

export function formatRecentCaseLabel(
  id: string,
  kind: WorkflowCaseRefKind,
  address?: string | null,
): string {
  const ref = workflowCaseReferenceLabel(id, kind);
  const addr = address?.trim();
  return addr ? `${ref} · ${addr}` : ref;
}

export function readRecentCaseVisits(): RecentCaseVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCaseVisit[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          typeof item?.id === 'string' &&
          item.id.length > 0 &&
          typeof item?.label === 'string' &&
          item.label.length > 0 &&
          typeof item?.href === 'string' &&
          item.href.length > 0,
      )
      .slice(0, MAX_RECENT_CASES);
  } catch {
    return [];
  }
}

function writeRecentCaseVisits(items: RecentCaseVisit[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_CASES)));
  } catch {
    // best-effort
  }
}

export function recordRecentCaseVisit(visit: RecentCaseVisit): RecentCaseVisit[] {
  const trimmed = visit.label.trim();
  if (!visit.id || !trimmed || !visit.href) return readRecentCaseVisits();

  const next: RecentCaseVisit[] = [
    { ...visit, label: trimmed },
    ...readRecentCaseVisits().filter((item) => item.id !== visit.id),
  ].slice(0, MAX_RECENT_CASES);

  writeRecentCaseVisits(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crossub:agent-recent-cases-updated'));
  }

  return next;
}

export const RECENT_CASES_UPDATED_EVENT = 'crossub:agent-recent-cases-updated';
