'use client';

import { Calendar, FileText, User } from 'lucide-react';

import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { formatLettingRent } from '@/lib/leasing/open-inspection-display';
import { formatDate, formatDateTime } from '@/lib/utils';

function FactTile({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="bg-secondary/30 rounded-xl px-3 py-2.5">
      <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

export function OpenInspectionScheduledStage({ session }: { session: OpenInspectionSession }) {
  const rental = session.rental;
  const inspectionTime =
    session.startTime && session.endTime
      ? `${formatDateTime(session.startTime)} – ${formatDateTime(session.endTime)}`
      : session.startTime
        ? formatDateTime(session.startTime)
        : '—';
  const inspectorName = session.agent?.name?.trim() || 'Unassigned';
  const notes = session.shortNote?.trim() || '—';

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Scheduled</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <FactTile
          label="Rent"
          value={rental?.rentPerWeek ? formatLettingRent(rental.rentPerWeek) : '—'}
        />
        <FactTile label="Lease term" value={rental?.leaseTerm?.trim() || '—'} />
        <FactTile
          label="Available from"
          value={rental?.availableFrom ? formatDate(rental.availableFrom) : '—'}
        />
        <FactTile label="Inspection time" value={inspectionTime} icon={Calendar} />
        <FactTile label="Inspector name" value={inspectorName} icon={User} />
      </div>
      <div className="mt-2">
        <FactTile
          label="Notes (Security Lock PIN)"
          value={notes}
          icon={FileText}
        />
      </div>
    </section>
  );
}
