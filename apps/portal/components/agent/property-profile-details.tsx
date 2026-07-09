'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { DocumentViewer } from '@/components/agent/document-viewer';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  findIngoingInspection,
  findRoutineInspection,
  resolveBondReference,
  resolveCurrentRent,
  resolveIngoingReportLink,
  resolveRoutineReportLink,
} from '@/lib/property-overview';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  Property,
  TenantSelectionCase,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { isViewableDocumentUrl } from '@/lib/document-preview';

function StatCell({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
        {label}
      </p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="text-primary mt-0.5 text-left text-xs font-semibold"
        >
          {value}
        </button>
      ) : (
        <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function ReportChip({
  label,
  href,
  status,
  onPreview,
}: {
  label: string;
  href?: string;
  status: string;
  onPreview: (report: { label: string; href: string }) => void;
}) {
  const opensInline = href && isViewableDocumentUrl(href) && !href.startsWith('/');
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/60 px-2.5 py-2">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium">{label}</p>
        <p className="text-muted-foreground truncate text-[10px] capitalize">{status}</p>
      </div>
      {href && href !== '#' ? (
        opensInline ? (
          <button
            type="button"
            onClick={() => onPreview({ label, href })}
            className="text-primary shrink-0 text-[11px] font-semibold"
          >
            View
          </button>
        ) : (
          <Link href={href} className="text-primary shrink-0 text-[11px] font-semibold">
            View
          </Link>
        )
      ) : null}
    </div>
  );
}

/** Registry / financial strip merged into the property profile header card. */
export function PropertyProfileDetails({
  property,
  propertyId,
  currentLease,
  inspections,
  propertyDocs,
  leasingCycles,
  tenantSelections,
  onViewBondLodgement,
}: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: TenantSelectionCase[];
  onViewBondLodgement?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const activeCycle = leasingCycles?.[0];
  const sync = usePropertyOverviewSync(
    property,
    apiConnected,
    activeCycle,
    tenantSelections,
    currentLease,
  );
  const [reportPreview, setReportPreview] = useState<{ label: string; href: string } | null>(
    null,
  );

  const propertyAddress = `${property.address}, ${property.suburb}`;
  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;
  const displayBond =
    sync.financial?.bondAmount ??
    sync.record?.bondAmount ??
    property.bondAmount ??
    sync.bond?.amount ??
    null;
  const displayDeposit =
    sync.financial?.depositAmount ?? sync.record?.depositAmount ?? property.depositAmount ?? null;

  const furnished =
    sync.overview?.furnished ??
    (typeof sync.record?.furnished === 'boolean' ? sync.record.furnished : property.furnished);

  const ingoingInspection = findIngoingInspection(inspections, propertyId, currentLease);
  const routineInspection = findRoutineInspection(inspections, propertyId);
  const ingoingReport = resolveIngoingReportLink(ingoingInspection, propertyDocs);
  const routineReport = resolveRoutineReportLink(routineInspection, propertyDocs);
  const bondRef = resolveBondReference(property, sync.bond, propertyDocs, currentLease);

  const registry = useMemo(
    () => ({
      propertyType: property.propertyType,
      state: property.state,
      postcode: property.postcode,
      furnished,
    }),
    [property.propertyType, property.state, property.postcode, furnished],
  );

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {reportPreview ? (
        <div className="mb-3">
          <DocumentViewer
            title={reportPreview.label}
            propertyAddress={propertyAddress}
            category="inspection"
            downloadUrl={reportPreview.href}
            onClose={() => setReportPreview(null)}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <span className="text-muted-foreground text-[10px] capitalize">{property.leaseStatus}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <StatCell
          label="Furnished"
          value={registry.furnished == null ? '—' : registry.furnished ? 'Yes' : 'No'}
        />
        <StatCell label="Property type" value={registry.propertyType ?? '—'} />
        <StatCell label="State" value={registry.state ?? '—'} />
        <StatCell label="Postcode" value={registry.postcode ?? '—'} />
        <StatCell
          label="Current rent"
          value={displayRent > 0 ? `${formatCurrency(displayRent)}/wk` : '—'}
        />
        <StatCell
          label="Bond"
          value={displayBond != null ? formatCurrency(displayBond) : '—'}
        />
        <StatCell
          label="Deposit"
          value={displayDeposit != null ? formatCurrency(displayDeposit) : '—'}
        />
        <StatCell
          label="Bond ID"
          value={bondRef.label}
          onClick={
            bondRef.showLodgementNav && onViewBondLodgement ? onViewBondLodgement : undefined
          }
        />
      </div>

      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <ReportChip
          label={ingoingReport.label}
          href={ingoingReport.href}
          status={ingoingReport.status}
          onPreview={setReportPreview}
        />
        <ReportChip
          label={routineReport.label}
          href={routineReport.href}
          status={routineReport.status}
          onPreview={setReportPreview}
        />
      </div>
    </div>
  );
}
