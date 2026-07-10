'use client';

import Link from 'next/link';
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Home,
  Users,
} from 'lucide-react';

import { StatusBadge } from '@/components/agent/status-badge';
import { inspectionDetail } from '@/constants/routes';
import type { DetailNavContext } from '@/lib/detail-navigation';
import {
  INSPECTION_TYPE_SHORT,
  inspectionNeedsAction,
  type InspectionListGroup,
} from '@/lib/inspections/presentation';
import { OPEN_CONDUCTED_BY_LABEL } from '@/lib/open-inspection';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

const TYPE_ICON = {
  OPEN: DoorOpen,
  INGOING: Home,
  OUTGOING: Home,
  ROUTINE: ClipboardList,
} as const;

export function InspectionJobCard({
  inspection,
  navContext,
}: {
  inspection: Inspection;
  navContext?: DetailNavContext;
}) {
  const Icon = TYPE_ICON[inspection.type];
  const needsAction = inspectionNeedsAction(inspection);
  const href = inspectionDetail(inspection.id, navContext);

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-2xl border bg-card p-4 transition active:bg-secondary/40',
        needsAction && 'border-primary/30 ring-1 ring-primary/10',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            inspection.type === 'OPEN' ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-secondary text-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {INSPECTION_TYPE_SHORT[inspection.type]}
            </span>
            {needsAction && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Action needed
              </span>
            )}
            <StatusBadge label={inspection.status} />
          </div>

          <div>
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{inspection.propertyAddress}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{inspection.trackingNumber}</p>
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {inspection.scheduledAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3 shrink-0" />
                {formatDateTime(inspection.scheduledAt)}
              </span>
            )}
            {inspection.inspector && <span>Inspector · {inspection.inspector}</span>}
            {inspection.type === 'OPEN' && inspection.openConductedBy && (
              <span>{OPEN_CONDUCTED_BY_LABEL[inspection.openConductedBy]}</span>
            )}
            {typeof inspection.visitorCount === 'number' && inspection.visitorCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3 shrink-0" />
                {inspection.visitorCount} visitor{inspection.visitorCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
      </div>
    </Link>
  );
}

export function InspectionGroupSection({
  group,
  label,
  inspections,
}: {
  group: InspectionListGroup;
  label: string;
  inspections: Inspection[];
}) {
  if (inspections.length === 0) return null;

  return (
    <section className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-sm font-semibold">{label}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">{inspections.length}</span>
        </div>
      ) : null}
      <div className="space-y-2">
        {inspections.map((inspection) => (
          <InspectionJobCard key={`${group}-${inspection.id}`} inspection={inspection} />
        ))}
      </div>
    </section>
  );
}
