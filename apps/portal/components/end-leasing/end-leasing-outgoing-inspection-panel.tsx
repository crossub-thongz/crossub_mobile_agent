'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ExternalLink, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { TerminationCompleteInspectionDialog } from '@/components/end-leasing/termination-complete-inspection-dialog';
import { OUTGOING_INSPECTION_DAYS_AFTER_VACATE } from '@/constants/end-leasing';
import { inspectionDetail } from '@/constants/routes';
import { fromTasks } from '@/lib/detail-navigation';
import {
  endLeasingKeyReturnDate,
  endLeasingVacateDate,
} from '@/lib/end-leasing/agent-workflow-model';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { suggestedOutgoingInspectionIsoFromDate } from '@/lib/inspections/outgoing-schedule';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import { terminationApi } from '@/lib/termination-case-api';
import { LEASING_ITEM_STATUS, LEASING_UI } from '@/lib/leasing/constants';
import { cn, formatDateTime } from '@/lib/utils';

const DONE = LEASING_ITEM_STATUS.DONE;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function EndLeasingOutgoingInspectionPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const { refresh, registerInspection } = useAgentData();
  const router = useRouter();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const inspection = caseData.inspection;
  const inspectionDone = inspection.status === DONE;
  const tenantAttendance = inspection.tenantAttendance ?? 'pending';
  const keysReturned = caseData.vacate.keysReturned === true;
  const inspectionHref = inspection.inspectionId
    ? inspectionDetail(inspection.inspectionId, fromTasks())
    : null;

  const openInspection = (inspectionId: string) => {
    router.push(inspectionDetail(inspectionId, fromTasks()));
  };

  const createOutgoingInspection = async () => {
    if (!keysReturned) {
      toast.error('Record key return on the Vacate step before scheduling the outgoing inspection');
      return;
    }
    const propertyId = caseData.propertyId;
    if (!propertyId) {
      toast.error('Property is not linked to this vacating case');
      return;
    }
    setCreateBusy(true);
    try {
      const anchor = endLeasingKeyReturnDate(caseData) ?? endLeasingVacateDate(caseData);
      const updated = await terminationApi.scheduleInspection(caseData.id, {
        inspector: 'Pending assignment',
        date: suggestedOutgoingInspectionIsoFromDate(anchor),
      });
      applyCase(updated);
      const inspectionId = updated.inspection?.inspectionId;
      if (!inspectionId) {
        toast.error('Outgoing inspection was created but could not be opened');
        return;
      }
      try {
        const record = await inspectionsApi.get(inspectionId);
        registerInspection(mapInspectionRecordToView(record));
      } catch {
        // Detail page can still resolve by id if the portfolio list is stale.
      }
      await refresh();
      toast.success('Outgoing inspection created');
      openInspection(inspectionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create outgoing inspection');
    } finally {
      setCreateBusy(false);
    }
  };

  const attendanceLabel =
    tenantAttendance === 'yes' ? 'Yes' : tenantAttendance === 'no' ? 'No' : 'Pending';

  const statusLabel = inspectionDone
    ? 'Completed'
    : inspection.inspectionDate
      ? 'Scheduled'
      : inspection.inspectionId
        ? 'Pending'
        : 'Not scheduled';

  const setAttendance = async (attendance: 'yes' | 'no') => {
    if (attendance === tenantAttendance) return;
    setAttendanceBusy(true);
    try {
      const updated = await terminationApi.setTenantOutgoingAttendance(caseData.id, attendance);
      applyCase(updated);
      toast.success(`Tenant attendance set to ${attendance === 'yes' ? 'Yes' : 'No'}`);
    } finally {
      setAttendanceBusy(false);
    }
  };

  return (
    <>
      <section>
        {!keysReturned ? (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:text-amber-50">
            Outgoing inspection is locked until key return is recorded on the Vacate step.
          </div>
        ) : null}
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Inspection date">
            {inspection.inspectionDate
              ? formatDateTime(inspection.inspectionDate)
              : 'Not scheduled'}
          </Field>
          <Field label="Inspector name">
            {inspection.inspectorName ?? 'Pending assignment'}
          </Field>
          <Field label="Tenant attend">{attendanceLabel}</Field>
          <Field label="Status">{statusLabel}</Field>
        </dl>

        {!inspectionDone ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={tenantAttendance === 'yes' ? 'default' : 'outline'}
              className="h-8 text-xs"
              disabled={attendanceBusy}
              onClick={() => void setAttendance('yes')}
            >
              Tenant attending: Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tenantAttendance === 'no' ? 'default' : 'outline'}
              className="h-8 text-xs"
              disabled={attendanceBusy}
              onClick={() => void setAttendance('no')}
            >
              Tenant attending: No
            </Button>
          </div>
        ) : null}

        {!inspection.inspectionId ? (
          <div
            className={cn(
              'mt-4 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4',
              LEASING_UI.ingoingTabGlow,
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-teal-950 dark:text-teal-50">
                  <ClipboardCheck className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  Schedule outgoing inspection
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Creates and schedules the outgoing inspection ({OUTGOING_INSPECTION_DAYS_AFTER_VACATE}{' '}
                  business days after key return), emails the tenant and agent, and opens the job
                  case.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className={cn('h-9 w-full shrink-0 gap-1.5 sm:w-auto', LEASING_UI.ingoingBtn)}
                disabled={createBusy || !keysReturned}
                onClick={() => void createOutgoingInspection()}
              >
                {createBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {createBusy ? 'Creating…' : 'Create outgoing inspection'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {!inspection.inspectionDate && !inspectionDone ? (
              <div
                className={cn(
                  'rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4',
                  LEASING_UI.ingoingTabGlow,
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Outgoing order created — confirm the date or reschedule. Tenant and agent are
                    emailed when the inspection is scheduled.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className={cn('h-9 w-full shrink-0 gap-1.5 sm:w-auto', LEASING_UI.ingoingBtn)}
                    disabled={createBusy || !keysReturned}
                    onClick={() => void createOutgoingInspection()}
                  >
                    {createBusy ? 'Scheduling…' : 'Schedule outgoing inspection'}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
            {inspectionHref ? (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Link href={inspectionHref}>
                  <ExternalLink className="size-3.5" />
                  Outgoing inspection job case
                </Link>
              </Button>
            ) : null}
            {!inspectionDone ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setCompleteDialogOpen(true)}
              >
                Mark inspection completed
              </Button>
            ) : null}
            </div>
          </div>
        )}
      </section>

      <TerminationCompleteInspectionDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        caseData={caseData}
        onCompleted={(updated) => applyCase(updated)}
      />
    </>
  );
}
