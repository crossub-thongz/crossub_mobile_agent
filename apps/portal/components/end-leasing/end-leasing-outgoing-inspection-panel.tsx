'use client';

import { ClipboardCheck, ExternalLink, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { TerminationCompleteInspectionDialog } from '@/components/end-leasing/termination-complete-inspection-dialog';
import { OUTGOING_INSPECTION_DAYS_AFTER_VACATE } from '@/constants/end-leasing';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
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
import { ensurePrepaidCharge } from '@/lib/crossub-api/agent-billing-client';
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
  const { refresh, registerInspection, inspections } = useAgentData();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [inspectionDialogId, setInspectionDialogId] = useState<string | null>(null);

  const inspection = caseData.inspection;
  const inspectionDone = inspection.status === DONE;
  const tenantAttendance = inspection.tenantAttendance ?? 'pending';
  const navContext = caseData.propertyId ? fromLeasingWorkflow(caseData.propertyId) : undefined;
  const dialogInspection = useMemo(
    () => inspections.find((item) => item.id === inspectionDialogId) ?? null,
    [inspectionDialogId, inspections],
  );

  const openInspection = (inspectionId: string) => {
    setInspectionDialogId(inspectionId);
  };

  const createOutgoingInspection = async () => {
    const propertyId = caseData.propertyId;
    if (!propertyId) {
      toast.error('Property is not linked to this vacating case');
      return;
    }
    setCreateBusy(true);
    try {
      const anchor = endLeasingKeyReturnDate(caseData) ?? endLeasingVacateDate(caseData);
      const platformChargeId = await ensurePrepaidCharge({
        serviceType: 'outgoing_inspection',
        propertyId,
      });
      const updated = await terminationApi.scheduleInspection(caseData.id, {
        inspector: 'Pending assignment',
        date: suggestedOutgoingInspectionIsoFromDate(anchor),
        ...(platformChargeId ? { platformChargeId } : {}),
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
                  Creates the inspection job, targets{' '}
                  {OUTGOING_INSPECTION_DAYS_AFTER_VACATE} days after key return, and opens it
                  so you can track inspector assignment and the report.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className={cn('h-9 w-full shrink-0 gap-1.5 sm:w-auto', LEASING_UI.ingoingBtn)}
                disabled={createBusy}
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
                    Outgoing order created — schedule the inspection date and assign an inspector.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className={cn('h-9 w-full shrink-0 gap-1.5 sm:w-auto', LEASING_UI.ingoingBtn)}
                    disabled={createBusy}
                    onClick={() => void createOutgoingInspection()}
                  >
                    {createBusy ? 'Scheduling…' : 'Schedule outgoing inspection'}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => openInspection(inspection.inspectionId!)}
            >
              <ExternalLink className="size-3.5" />
              Outgoing inspection job case
            </Button>
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

      <InspectionDetailDialog
        open={inspectionDialogId !== null}
        onClose={() => setInspectionDialogId(null)}
        inspection={dialogInspection}
        navContext={navContext}
      />
    </>
  );
}
