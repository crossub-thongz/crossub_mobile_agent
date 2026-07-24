'use client';

import { History, User } from 'lucide-react';

import { formatDateTime } from '@/lib/utils';
import type { ServerRoutineScheduleAuditEntry } from '@/lib/routine-inspection-api';

const FIELD_LABEL: Record<string, string> = {
  next_inspection_date: 'Next inspection date',
  frequency: 'Frequency',
  schedule: 'Schedule',
  inspection_flow: 'Inspection flow',
};

const REASON_LABEL: Record<string, string> = {
  tenant_delayed_submission: 'Tenant delayed submission',
  agent_requested_cycle: 'Agent requested change',
  regulation_exception: 'Regulation exception',
  property_inaccessible: 'Property inaccessible',
  portfolio_transition: 'Existing portfolio transition',
  admin_correction: 'Admin correction',
  tenant_overseas: 'Tenant overseas / unavailable',
  owner_request: 'Owner / landlord request',
  legal_exception: 'Legal exception',
  renovation_in_progress: 'Renovation in progress',
  other: 'Other',
};

export function RoutineAuditTrail({ entries }: { entries: ServerRoutineScheduleAuditEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="border-border/60 bg-card/30 rounded-2xl border">
      <div className="flex items-center gap-2 px-4 py-3">
        <History className="text-muted-foreground size-4" />
        <h3 className="text-sm font-semibold">Audit trail</h3>
        <span className="text-muted-foreground ml-auto text-[11px]">
          {entries.length} change{entries.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-3 border-t px-4 py-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="border-border/40 bg-background/30 rounded-lg border p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {FIELD_LABEL[entry.field] ?? entry.field} changed
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatDateTime(entry.changedAt)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 line-through dark:text-rose-300">
                {entry.previousValue}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                {entry.newValue}
              </span>
            </div>
            <div className="text-muted-foreground mt-2">
              Reason:{' '}
              <span className="text-foreground/80">
                {REASON_LABEL[entry.reason] ?? entry.reason.replaceAll('_', ' ')}
              </span>
            </div>
            {entry.reasonNote ? (
              <p className="text-muted-foreground mt-1 italic">“{entry.reasonNote}”</p>
            ) : null}
            <div className="text-muted-foreground mt-2 flex items-center gap-1">
              <User className="size-3" />
              <span>{entry.changedBy}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
