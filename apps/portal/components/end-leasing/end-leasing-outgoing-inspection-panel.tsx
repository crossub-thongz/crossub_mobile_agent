'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TerminationCompleteInspectionDialog } from '@/components/end-leasing/termination-complete-inspection-dialog';
import { inspectionDetail } from '@/constants/routes';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { terminationApi } from '@/lib/termination-case-api';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { formatDate, formatDateTime } from '@/lib/utils';

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
  const router = useRouter();
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const inspection = caseData.inspection;
  const inspectionDone = inspection.status === DONE;
  const tenantAttendance = inspection.tenantAttendance ?? 'pending';

  const attendanceLabel =
    tenantAttendance === 'yes' ? 'Yes' : tenantAttendance === 'no' ? 'No' : 'Pending';

  const statusLabel = inspectionDone ? 'Completed' : inspection.inspectionDate ? 'Scheduled' : 'Not scheduled';

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
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Outgoing inspection</p>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {inspection.inspectionId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                router.push(
                  inspectionDetail(
                    inspection.inspectionId!,
                    caseData.propertyId
                      ? fromLeasingWorkflow(caseData.propertyId)
                      : undefined,
                  ),
                );
              }}
            >
              <ExternalLink className="size-3.5" />
              Open inspection job case
            </Button>
          ) : null}
          {!inspectionDone ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setCompleteDialogOpen(true)}
            >
              Mark inspection completed
            </Button>
          ) : null}
        </div>
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
