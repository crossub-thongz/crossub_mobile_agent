'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { Button } from '@/components/ui/button';
import type { TenantOutgoingAttendanceStatus } from '@/lib/end-leasing/types';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { terminationApi } from '@/lib/termination-case-api';
import { cn, formatDateTime } from '@/lib/utils';

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug">{children}</dd>
    </div>
  );
}

export function OutgoingInspectionCaseSection({
  inspectionDate,
  inspectorName,
  tenantAttendance,
  statusCompleted,
  terminationCaseId,
  onAttendanceChange,
  emails,
  emailTitle,
}: {
  inspectionDate: string | null;
  inspectorName: string;
  tenantAttendance: TenantOutgoingAttendanceStatus;
  statusCompleted: boolean;
  terminationCaseId?: string | null;
  onAttendanceChange?: (attendance: 'yes' | 'no' | 'pending') => void;
  emails: JobCaseEmailRecord[];
  emailTitle?: string;
}) {
  const [busy, setBusy] = useState(false);

  const attendanceLabel =
    tenantAttendance === 'yes' ? 'Yes' : tenantAttendance === 'no' ? 'No' : '—';

  const setAttendance = async (attendance: 'yes' | 'no') => {
    if (attendance === tenantAttendance) return;
    if (!terminationCaseId) {
      toast.error('No end-leasing case is linked to this property');
      return;
    }
    setBusy(true);
    try {
      const updated = await terminationApi.setTenantOutgoingAttendance(
        terminationCaseId,
        attendance,
      );
      const next = updated.inspection.tenantAttendance;
      onAttendanceChange?.(next === 'yes' || next === 'no' ? next : 'pending');
      toast.success(`Tenant attendance set to ${attendance === 'yes' ? 'Yes' : 'No'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update tenant attendance');
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = statusCompleted ? 'Completed' : 'Scheduled';

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">Outgoing</h3>
        </div>
        <div className="p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <SummaryField label="Inspection date">
              {inspectionDate ? formatDateTime(inspectionDate) : 'Not scheduled'}
            </SummaryField>
            <SummaryField label="Inspector">{inspectorName}</SummaryField>
            <div>
              <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Tenant attend
              </dt>
              <dd className="mt-2">
                {terminationCaseId && !statusCompleted ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={tenantAttendance === 'yes' ? 'default' : 'outline'}
                      className="h-8 min-w-[3.5rem] text-xs"
                      disabled={busy}
                      onClick={() => void setAttendance('yes')}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tenantAttendance === 'no' ? 'default' : 'outline'}
                      className="h-8 min-w-[3.5rem] text-xs"
                      disabled={busy}
                      onClick={() => void setAttendance('no')}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm font-medium">{attendanceLabel}</span>
                )}
              </dd>
            </div>
            <SummaryField label="Status">
              <span
                className={cn(statusCompleted && 'text-emerald-600 dark:text-emerald-400')}
              >
                {statusLabel}
              </span>
            </SummaryField>
          </dl>
        </div>
      </section>

      <JobCaseStageEmailHistory emails={emails} title={emailTitle ?? 'Email history'} />
    </div>
  );
}
