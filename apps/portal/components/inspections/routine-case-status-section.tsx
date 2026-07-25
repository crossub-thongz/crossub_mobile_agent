'use client';

import { CheckCircle2, CircleDashed } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  resolveRoutineReportStatus,
  routineConductModeLabel,
  type RoutineFlow,
} from '@/lib/routine/routine-case-status';
import type { ServerRoutineScheduleView } from '@/lib/routine-inspection-api';
import { cn } from '@/lib/utils';

export function RoutineCaseStatusSection({
  flow,
  schedule,
  hasReport,
  inspectionStatus,
  apiConnected,
  onChangeFlow,
}: {
  flow: RoutineFlow | null;
  schedule: ServerRoutineScheduleView | null;
  hasReport: boolean;
  inspectionStatus: string;
  apiConnected: boolean;
  onChangeFlow: () => void;
}) {
  const reportStatus = resolveRoutineReportStatus({
    flow: flow ?? 'self',
    selfStatus: schedule?.selfStatus,
    inPersonStatus: schedule?.inPersonStatus,
    hasReport,
    inspectionStatus,
  });

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Routine inspection</h2>
      <dl className="grid gap-2 text-xs">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5">
          <dt className="text-muted-foreground">Conduct mode</dt>
          <dd className="text-right font-medium">
            {flow ? routineConductModeLabel(flow) : 'Loading…'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-muted-foreground">Final report</dt>
          <dd className="flex items-center justify-end gap-1.5 text-right font-medium">
            {reportStatus.complete ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            ) : (
              <CircleDashed className="text-muted-foreground size-3.5 shrink-0" />
            )}
            <span className={cn(reportStatus.complete && 'text-primary')}>{reportStatus.label}</span>
          </dd>
        </div>
      </dl>
      {apiConnected && schedule ? (
        <div className="pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={onChangeFlow}
          >
            Change conduct mode
          </Button>
        </div>
      ) : null}
    </section>
  );
}
