'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Calendar, ChevronRight, Users } from 'lucide-react';

import { ApplicantListDialog } from '@/components/agent/applicant-list-dialog';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { tenantSelectionDetail } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';
import { tenantSelectionDecisionKey } from '@/lib/tenant-selection';
import type { LeasingRecord, TenantSelectionCase } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type Milestone =
  | { kind: 'step'; label: string; at?: string }
  | { kind: 'applications'; label: string; count: number };

function leasingMilestones(
  record: LeasingRecord,
  options?: { omitOpenInspection?: boolean },
): Milestone[] {
  const steps: Milestone[] = [];
  if (record.openInspectionDate && !options?.omitOpenInspection) {
    steps.push({ kind: 'step', label: 'Open inspection', at: record.openInspectionDate });
  }
  if (record.applicationCount) {
    steps.push({
      kind: 'applications',
      label: `${record.applicationCount} applications received`,
      count: record.applicationCount,
    });
  }
  if (record.moveInDate) {
    steps.push({ kind: 'step', label: 'Move-in date', at: record.moveInDate });
  }
  steps.push({ kind: 'step', label: 'Lease period', at: record.leaseStart });
  return steps;
}

export function LeasingTicketCard({
  propertyId,
  record,
  selection,
  omitOpenInspection = false,
}: {
  propertyId: string;
  record?: LeasingRecord;
  selection?: TenantSelectionCase;
  omitOpenInspection?: boolean;
}) {
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const { tenantSelections } = useAgentData();
  const tenantSelectionDecisions = useAgentStore((s) => s.tenantSelectionDecisions);

  const activeSelection =
    selection ?? tenantSelections.find((t) => t.propertyId === propertyId);
  const decisionKey = tenantSelectionDecisionKey(propertyId, activeSelection?.id);
  const applicationDecision = tenantSelectionDecisions[decisionKey];

  if (activeSelection && !record) {
    return (
      <>
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-primary text-xs font-semibold uppercase">Leasing ticket</p>
              <p className="text-sm font-semibold">{activeSelection.applicantName}</p>
              <p className="text-muted-foreground text-xs">{activeSelection.status}</p>
              {!activeSelection.requiresApproval && activeSelection.status.startsWith('Approved') && (
                <StatusBadge label="Approved" variant="success" className="mt-2" />
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setApplicantsOpen(true)}
            >
              <Users className="size-3.5" />
              Applications
            </Button>
          </div>
          {activeSelection.timeline.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
                Timeline
              </p>
              <Timeline entries={activeSelection.timeline} />
            </div>
          )}
          <Link
            href={tenantSelectionDetail(activeSelection.id)}
            className="text-primary flex items-center gap-1 text-xs font-medium"
          >
            View full application
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <ApplicantListDialog
          open={applicantsOpen}
          onClose={() => setApplicantsOpen(false)}
          propertyId={propertyId}
          propertyAddress={activeSelection.propertyAddress}
          proposedRent={activeSelection.proposedRent}
          selection={activeSelection}
        />
      </>
    );
  }

  if (!record) return null;

  const milestones = leasingMilestones(record, { omitOpenInspection });

  return (
    <>
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-primary text-xs font-semibold uppercase">Leasing ticket</p>
            <p className="text-sm font-semibold">{record.approvedTenant}</p>
            <p className="text-muted-foreground text-xs capitalize">{record.status} tenancy</p>
            {applicationDecision?.action === 'approved' && (
              <p className="text-primary mt-1 text-xs font-medium">
                Approved applicant: {applicationDecision.applicantName}
              </p>
            )}
          </div>
          {record.applicationCount ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setApplicantsOpen(true)}
            >
              <Users className="size-3.5" />
              Applications
            </Button>
          ) : null}
        </div>
        <div className="space-y-1 text-xs">
          {milestones.map((m) =>
            m.kind === 'applications' ? (
              <button
                key={m.label}
                type="button"
                onClick={() => setApplicantsOpen(true)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors',
                  'hover:bg-primary/5 hover:text-primary',
                )}
              >
                <Calendar className="text-primary size-3 shrink-0" />
                <span className="text-primary font-medium underline-offset-2 hover:underline">
                  {m.label}
                </span>
              </button>
            ) : (
              <div key={m.label} className="flex items-center gap-2 px-1 py-1">
                <Calendar className="text-muted-foreground size-3 shrink-0" />
                <span>
                  {m.label}
                  {m.at ? ` · ${formatDate(m.at)}` : ''}
                </span>
              </div>
            ),
          )}
          <p className="text-muted-foreground px-1 pt-1">
            {formatDate(record.leaseStart)} — {formatDate(record.leaseEnd)} ·{' '}
            {formatCurrency(record.rentWeekly)}/wk
          </p>
        </div>
      </div>
      <ApplicantListDialog
        open={applicantsOpen}
        onClose={() => setApplicantsOpen(false)}
        propertyId={propertyId}
        applicationCount={record.applicationCount}
        selection={activeSelection}
      />
    </>
  );
}
