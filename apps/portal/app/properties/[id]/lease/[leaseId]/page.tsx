'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  ClipboardList,
  FileText,
  Gavel,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import {
  LeaseDocumentList,
  LeaseHistoryList,
  LeaseHistorySection,
  RentHistoryList,
} from '@/components/agent/lease-history-section';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { buildLeasePackageData } from '@/lib/lease-package-data';
import { leaseHistoryLabel } from '@/lib/lease-label';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';

export default function LeasePackagePage() {
  const params = useParams();
  const propertyId = params.id as string;
  const leaseId = params.leaseId as string;
  const {
    leasingRecords,
    documents,
    properties,
    maintenanceAll,
    inspections,
    rentReviews,
    tribunalCases,
    accounting,
  } = useAgentData();

  const record = leasingRecords.find((l) => l.id === leaseId && l.propertyId === propertyId);
  const property = properties.find((p) => p.id === propertyId);

  const packageData = useMemo(() => {
    if (!record || !property) return null;
    return buildLeasePackageData(record, property, {
      maintenance: maintenanceAll,
      inspections,
      rentReviews,
      tribunalCases,
      documents,
      accounting: accounting.find((a) => a.propertyId === propertyId),
    });
  }, [
    record,
    property,
    maintenanceAll,
    inspections,
    rentReviews,
    tribunalCases,
    documents,
    accounting,
    propertyId,
  ]);

  if (!record || !property || !packageData) notFound();

  const propertyAddress = formatPropertyFullAddress(property);

  return (
    <AgentShell title="Lease record" backHref={propertyDetail(propertyId)} backLabel="Property">
      <div className="space-y-4 pb-8">
        <InfoPanel title={leaseHistoryLabel(record)} icon={FileText}>
          <InfoRow label="Tenant" value={record.approvedTenant} />
          <InfoRow
            label="Leasing period"
            value={`${formatDate(record.leaseStart)} — ${formatDate(record.leaseEnd)}`}
          />
          <InfoRow label="Rent" value={`${formatCurrency(record.rentWeekly)}/wk`} />
          {record.bondAmount != null && (
            <InfoRow label="Bond" value={formatCurrency(record.bondAmount)} />
          )}
          {record.depositAmount != null && (
            <InfoRow label="Deposit" value={formatCurrency(record.depositAmount)} />
          )}
          {record.moveInDate && (
            <InfoRow label="Move in" value={formatDate(record.moveInDate)} />
          )}
        </InfoPanel>

        <LeaseHistorySection
          title="Lease agreement & proofs"
          icon={FileText}
          isEmpty={packageData.documents.length === 0}
          empty="No documents on file for this lease."
          collapsible
          defaultOpen={false}
          itemCount={packageData.documents.length}
        >
          <LeaseDocumentList documents={packageData.documents} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Rent history"
          icon={Wallet}
          isEmpty={packageData.rentPayments.length === 0}
          empty="No rent payments recorded for this leasing period."
          collapsible
          defaultOpen={false}
          itemCount={packageData.rentPayments.length}
        >
          <RentHistoryList payments={packageData.rentPayments} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Tribunal history"
          icon={Gavel}
          isEmpty={packageData.tribunal.length === 0}
          empty="No tribunal matters during this leasing period."
          collapsible
          defaultOpen={false}
          itemCount={packageData.tribunal.length}
        >
          <LeaseHistoryList
            items={packageData.tribunal}
            propertyId={propertyId}
            propertyAddress={propertyAddress}
          />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Rent review history"
          icon={TrendingUp}
          isEmpty={packageData.rentReviews.length === 0}
          empty="No rent reviews during this leasing period."
          collapsible
          defaultOpen={false}
          itemCount={packageData.rentReviews.length}
        >
          <LeaseHistoryList
            items={packageData.rentReviews}
            propertyId={propertyId}
            propertyAddress={propertyAddress}
          />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Maintenance history"
          icon={Wrench}
          isEmpty={packageData.maintenance.length === 0}
          empty="No maintenance jobs during this leasing period."
          collapsible
          defaultOpen={false}
          itemCount={packageData.maintenance.length}
        >
          <LeaseHistoryList
            items={packageData.maintenance}
            propertyId={propertyId}
            propertyAddress={propertyAddress}
          />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Inspection history"
          icon={ClipboardList}
          isEmpty={packageData.inspections.length === 0}
          empty="No inspections during this leasing period."
          collapsible
          defaultOpen={false}
          itemCount={packageData.inspections.length}
        >
          <LeaseHistoryList
            items={packageData.inspections}
            propertyId={propertyId}
            propertyAddress={propertyAddress}
          />
        </LeaseHistorySection>

        <Link
          href={`${propertyDetail(propertyId)}?tab=Documents`}
          className="text-primary block text-center text-xs font-medium"
        >
          All property documents →
        </Link>
      </div>
    </AgentShell>
  );
}
