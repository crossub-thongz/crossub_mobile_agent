'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  ClipboardList,
  FileText,
  Gavel,
  Receipt,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import {
  LeaseHistoryList,
  LeaseHistorySection,
  RentHistoryList,
} from '@/components/agent/lease-history-section';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, propertyDetail, ROUTES } from '@/constants/routes';
import { buildLeasePackageData } from '@/lib/lease-package-data';
import { leaseHistoryLabel } from '@/lib/lease-label';
import { formatCurrency, formatDate } from '@/lib/utils';

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
    messages,
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

  const propertyThread = messages.find((m) => m.propertyId === propertyId);

  return (
    <AgentShell title="Leasing package" backHref={`${propertyDetail(propertyId)}?tab=Overview`}>
      <div className="space-y-4">
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
        >
          <div className="space-y-1.5">
            {packageData.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border bg-secondary/20 px-3 py-2.5 text-sm"
              >
                <span>{doc.label}</span>
                {doc.status === 'available' && doc.href ? (
                  <Link href={doc.href} className="text-primary text-xs font-semibold">
                    View
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-xs">Pending</span>
                )}
              </div>
            ))}
          </div>
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Rent history"
          icon={Wallet}
          isEmpty={packageData.rentPayments.length === 0}
          empty="No rent payments recorded for this leasing period."
        >
          <RentHistoryList payments={packageData.rentPayments} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Tribunal history"
          icon={Gavel}
          isEmpty={packageData.tribunal.length === 0}
          empty="No tribunal matters during this leasing period."
        >
          <LeaseHistoryList items={packageData.tribunal} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Rent review history"
          icon={TrendingUp}
          isEmpty={packageData.rentReviews.length === 0}
          empty="No rent reviews during this leasing period."
        >
          <LeaseHistoryList items={packageData.rentReviews} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Maintenance history"
          icon={Wrench}
          isEmpty={packageData.maintenance.length === 0}
          empty="No maintenance jobs during this leasing period."
        >
          <LeaseHistoryList items={packageData.maintenance} />
        </LeaseHistorySection>

        <LeaseHistorySection
          title="Inspection history"
          icon={ClipboardList}
          isEmpty={packageData.inspections.length === 0}
          empty="No inspections during this leasing period."
        >
          <LeaseHistoryList items={packageData.inspections} />
        </LeaseHistorySection>

        <LeaseHistorySection title="Communication history" icon={Receipt}>
          {propertyThread ? (
            <Link
              href={messageDetail(propertyThread.id)}
              className="flex items-center justify-between rounded-xl border px-3 py-3 text-sm hover:border-primary/30"
            >
              <div>
                <p className="font-medium">{propertyThread.subject}</p>
                <p className="text-muted-foreground line-clamp-1 text-xs">
                  {propertyThread.lastMessage}
                </p>
              </div>
              <span className="text-primary text-xs font-semibold">Open thread</span>
            </Link>
          ) : (
            <p className="text-muted-foreground px-1 py-2 text-sm">No messages for this property.</p>
          )}
        </LeaseHistorySection>

        <Link
          href={`${propertyDetail(propertyId)}?tab=Documents`}
          className="text-primary block text-center text-xs font-medium"
        >
          All property documents →
        </Link>
        <Link href={ROUTES.MESSAGES} className="text-muted-foreground block text-center text-xs">
          Message centre
        </Link>
      </div>
    </AgentShell>
  );
}
