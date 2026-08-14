'use client';

import { useEffect, useState } from 'react';
import { Calendar, FileText, User } from 'lucide-react';

import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  formatInspectionDurationHours,
  formatLettingRent,
  isAssignedInspectorName,
} from '@/lib/leasing/open-inspection-display';
import { formatDate, formatDateTime } from '@/lib/utils';
import { OpenInspectionEarlyStartNotice } from '@/components/open-inspection/open-inspection-early-start-notice';
import { OpenInspectionConfirmTimeButton } from '@/components/open-inspection/open-inspection-confirm-time-button';

const POOL_INSPECTOR_LABEL = 'Pending — task pool';

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

export function OpenInspectionScheduledStage({
  session,
  fieldInspectorName,
  onConfirmed,
}: {
  session: OpenInspectionSession;
  /** CROSSUB field inspector from the linked pool job — not the managing agent on the session. */
  fieldInspectorName?: string | null;
  /** Refresh the session after the agent confirms the time. */
  onConfirmed?: (confirmedAt: string) => void;
}) {
  const [resolvedInspector, setResolvedInspector] = useState<string | null | undefined>(
    fieldInspectorName,
  );

  useEffect(() => {
    setResolvedInspector(fieldInspectorName);
  }, [fieldInspectorName]);

  useEffect(() => {
    if (fieldInspectorName !== undefined) return;
    if (!session.inspectionId) {
      setResolvedInspector(null);
      return;
    }
    let cancelled = false;
    void inspectionsApi
      .get(session.inspectionId)
      .then((record) => {
        if (!cancelled) setResolvedInspector(record.inspectorName);
      })
      .catch(() => {
        if (!cancelled) setResolvedInspector(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldInspectorName, session.inspectionId]);

  const rental = session.rental;
  const inspectionTime =
    session.startTime && session.endTime
      ? `${formatDateTime(session.startTime)} – ${formatDateTime(session.endTime)}`
      : session.startTime
        ? formatDateTime(session.startTime)
        : '—';
  const inspectionDuration =
    session.startTime && session.endTime
      ? formatInspectionDurationHours(session.startTime, session.endTime)
      : null;
  const inspectorName = isAssignedInspectorName(resolvedInspector)
    ? resolvedInspector!.trim()
    : POOL_INSPECTOR_LABEL;
  const notes = session.shortNote?.trim() || '—';

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Scheduled</h2>
      <OpenInspectionEarlyStartNotice
        startedEarly={session.startedEarly}
        startedEarlyAt={session.startedEarlyAt}
        originalScheduledStart={session.originalScheduledStart}
        className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-50"
      />
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
        {inspectionDuration ? (
          <FactTile label="Duration" value={inspectionDuration} />
        ) : null}
        <FactTile label="Inspector name" value={inspectorName} icon={User} />
      </div>
      <div className="mt-2">
        <FactTile
          label="Notes (Security Lock PIN)"
          value={notes}
          icon={FileText}
        />
      </div>

      {/* Geng Xu, 14 Aug: the agent confirms the time once an inspector has taken the job.
          It sits here rather than in its own card because this is where the time and the
          inspector are already on screen — confirming is an answer to what is above it. */}
      <div className="mt-3 border-t pt-3">
        <OpenInspectionConfirmTimeButton
          propertyId={session.propertyId}
          job={session.openInspection}
          scheduledStart={session.startTime}
          onConfirmed={onConfirmed}
        />
      </div>
    </section>
  );
}
