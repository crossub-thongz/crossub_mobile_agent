'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Calendar, ChevronRight, Users } from 'lucide-react';

import { ApplicantListDialog } from '@/components/agent/applicant-list-dialog';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { Timeline } from '@/components/agent/timeline';
import { Button } from '@/components/ui/button';
import { propertyLeasePackage, tenantSelectionDetail } from '@/constants/routes';
import type { LeasingRecord, TenantSelectionCase } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function leasingMilestones(record: LeasingRecord) {
  const steps: { label: string; at?: string }[] = [];
  if (record.openInspectionDate) {
    steps.push({ label: 'Open inspection', at: record.openInspectionDate });
  }
  if (record.applicationCount) {
    steps.push({ label: `${record.applicationCount} applications received` });
  }
  if (record.moveInDate) {
    steps.push({ label: 'Move-in date', at: record.moveInDate });
  }
  steps.push({ label: 'Lease period', at: record.leaseStart });
  return steps;
}

export function LeasingTicketCard({
  propertyId,
  record,
  selection,
}: {
  propertyId: string;
  record?: LeasingRecord;
  selection?: TenantSelectionCase;
}) {
  const [applicantsOpen, setApplicantsOpen] = useState(false);

  if (selection) {
    return (
      <>
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-primary text-xs font-semibold uppercase">Leasing ticket</p>
              <p className="text-sm font-semibold">{selection.applicantName}</p>
              <p className="text-muted-foreground text-xs">{selection.status}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setApplicantsOpen(true)}
            >
              <Users className="size-3.5" />
              Applicants
            </Button>
          </div>
          {selection.timeline.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
                Timeline
              </p>
              <Timeline entries={selection.timeline} />
            </div>
          )}
          <ModuleCommunications
            propertyId={propertyId}
            categories={['Leasing']}
            title="Leasing communications"
          />
          <Link
            href={tenantSelectionDetail(selection.id)}
            className="text-primary flex items-center gap-1 text-xs font-medium"
          >
            View full application
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <ApplicantListDialog
          open={applicantsOpen}
          onClose={() => setApplicantsOpen(false)}
          selection={selection}
        />
      </>
    );
  }

  if (!record) return null;

  const milestones = leasingMilestones(record);

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div>
        <p className="text-primary text-xs font-semibold uppercase">Leasing ticket</p>
        <p className="text-sm font-semibold">{record.approvedTenant}</p>
        <p className="text-muted-foreground text-xs capitalize">{record.status} tenancy</p>
      </div>
      <div className="space-y-1 text-xs">
        {milestones.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-3 shrink-0" />
            <span>
              {m.label}
              {m.at ? ` · ${formatDate(m.at)}` : ''}
            </span>
          </div>
        ))}
        <p className="text-muted-foreground pt-1">
          {formatDate(record.leaseStart)} — {formatDate(record.leaseEnd)} ·{' '}
          {formatCurrency(record.rentWeekly)}/wk
        </p>
      </div>
      <ModuleCommunications
        propertyId={propertyId}
        categories={['Leasing']}
        title="Leasing communications"
      />
      <Link
        href={propertyLeasePackage(propertyId, record.id)}
        className="text-primary flex items-center gap-1 text-xs font-medium"
      >
        View leasing package
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}
