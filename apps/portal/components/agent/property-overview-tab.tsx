'use client';

import Link from 'next/link';
import {
  Building2,
  History,
  ListTodo,
  Mail,
  Phone,
  User,
} from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { PropertyPhotosButton } from '@/components/agent/property-photos-dialog';
import { TaskStatusRow } from '@/components/agent/task-status-row';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { maintenanceDetail, ROUTES } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  findIngoingInspection,
  findRoutineInspection,
  resolveBondId,
  resolveCurrentRent,
  resolveIngoingReportLink,
  resolveLeaseDates,
  resolvePendingRentChange,
  resolveRoutineReportLink,
} from '@/lib/property-overview';
import type {
  AgentDocument,
  Inspection,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyNeedAction,
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function ReportRow({ label, href, status }: { label: string; href?: string; status: string }) {
  return (
    <InfoRow label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm capitalize">{status}</span>
        {href && href !== '#' ? (
          <Link href={href} className="text-primary text-sm font-semibold">
            View
          </Link>
        ) : null}
      </div>
    </InfoRow>
  );
}

function ContactBlock({
  name,
  email,
  phone,
}: {
  name: string;
  email?: string;
  phone?: string;
}) {
  return (
    <>
      <InfoRow label="Name" value={name} />
      {email ? (
        <InfoRow label="Email">
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-primary">
            <Mail className="size-3.5" />
            {email}
          </a>
        </InfoRow>
      ) : (
        <InfoRow label="Email" value="—" />
      )}
      {phone ? (
        <InfoRow label="Mobile">
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="flex items-center gap-1.5"
          >
            <Phone className="size-3.5" />
            {phone}
          </a>
        </InfoRow>
      ) : (
        <InfoRow label="Mobile" value="—" />
      )}
    </>
  );
}

export function PropertyOverviewTab({
  property,
  propertyId,
  needActions,
  maintenance,
  inspections,
  propertyDocs,
  leasing,
  currentLease,
  rentReviewDecisions,
  tenancyRentReviews,
  onViewHistory,
}: {
  property: Property;
  propertyId: string;
  needActions: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasing: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  tenancyRentReviews: import('@/lib/types').RentReviewCase[];
  onViewHistory: () => void;
}) {
  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const currentRent = resolveCurrentRent(property, currentLease);
  const { start: leaseStart, end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const pendingRent = resolvePendingRentChange(property, tenancyRentReviews, rentReviewDecisions, {
    isVacant,
    currentRent,
  });

  const ingoingInspection = findIngoingInspection(inspections, propertyId, currentLease);
  const routineInspection = findRoutineInspection(inspections, propertyId);
  const ingoingReport = resolveIngoingReportLink(ingoingInspection, propertyDocs);
  const routineReport = resolveRoutineReportLink(routineInspection, propertyDocs);
  const bondId = resolveBondId(property, propertyDocs, currentLease);

  const landlords = [
    {
      name: property.homeOwnerName,
      email: property.homeOwnerContact.email,
      phone: property.homeOwnerContact.phone,
    },
    ...(property.additionalLandlords ?? []),
  ];

  const tenants = isVacant
    ? []
    : [
        {
          name: property.tenantName,
          email: property.tenantContact.email,
          phone: property.tenantContact.phone,
        },
        ...(property.additionalTenants ?? []),
      ];

  return (
    <div className="space-y-4">
      {needActions.length > 0 || maintenance.length > 0 ? (
        <InfoPanel
          title="Tasks"
          icon={ListTodo}
          tone={needActions.length > 0 ? 'warning' : 'default'}
        >
          <div className="space-y-2">
            {needActions.length === 0 && maintenance.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active tasks.</p>
            ) : (
              <>
                {needActions.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="block rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive"
                  >
                    {a.label}
                  </Link>
                ))}
                {maintenance.map((m) => (
                  <TaskStatusRow
                    key={m.id}
                    item={{
                      id: m.id,
                      propertyAddress: m.propertyAddress,
                      taskLabel: m.title,
                      status: m.status,
                      href: maintenanceDetail(m.id, fromProperty(propertyId, 'Maintenance')),
                      module: 'Maintenance',
                      requiresApproval: m.requiresApproval,
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </InfoPanel>
      ) : null}

      <InfoPanel title="Property details" icon={Building2}>
        <div className="grid grid-cols-2 gap-x-4">
          <InfoRow label="Bedrooms" value={property.bedrooms ?? '—'} />
          <InfoRow label="Bathrooms" value={property.bathrooms ?? '—'} />
          <InfoRow label="Car spaces" value={property.carSpaces ?? '—'} />
          <InfoRow label="Status" value={property.leaseStatus} />
        </div>
        <div className="mt-2 border-t pt-2">
          <ReportRow
            label={ingoingReport.label}
            href={ingoingReport.href}
            status={ingoingReport.status}
          />
          <ReportRow
            label={routineReport.label}
            href={routineReport.href}
            status={routineReport.status}
          />
          <InfoRow label="Bond ID" value={bondId} />
        </div>
        <div className="mt-4">
          <PropertyPhotosButton propertyAddress={`${property.address}, ${property.suburb}`} />
        </div>
      </InfoPanel>

      <InfoPanel title="Tenancy details" icon={User}>
        {isVacant ? (
          <p className="text-muted-foreground text-sm">Vacant — no active tenancy.</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tenant on file.</p>
        ) : (
          <div className="space-y-4">
            {tenants.map((tenant, index) => (
              <div
                key={`${tenant.name}-${index}`}
                className={tenants.length > 1 ? 'rounded-lg border border-border/60 p-3' : undefined}
              >
                {tenants.length > 1 ? (
                  <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
                    Tenant {index + 1}
                  </p>
                ) : null}
                <ContactBlock
                  name={tenant.name}
                  email={tenant.email}
                  phone={tenant.phone}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t pt-2">
          <InfoRow
            label="Lease start date"
            value={leaseStart ? formatDate(leaseStart) : '—'}
          />
          <InfoRow label="Lease end date" value={leaseEnd ? formatDate(leaseEnd) : '—'} />
          <InfoRow
            label="Current rent"
            value={currentRent > 0 ? `${formatCurrency(currentRent)}/wk` : '—'}
          />
          {pendingRent ? (
            <>
              <InfoRow
                label="New rent"
                value={`${formatCurrency(pendingRent.newRent)}/wk`}
              />
              <InfoRow
                label="New rent start date"
                value={formatDate(pendingRent.startDate)}
              />
            </>
          ) : !isVacant && tenancyRentReviews.length === 0 ? (
            <p className="text-muted-foreground pt-2 text-xs">
              No pending rent review.
            </p>
          ) : null}
        </div>
      </InfoPanel>

      <InfoPanel title="Landlord details" icon={Building2}>
        <div className="space-y-4">
          {landlords.map((landlord, index) => (
            <div
              key={`${landlord.name}-${index}`}
              className={landlords.length > 1 ? 'rounded-lg border border-border/60 p-3' : undefined}
            >
              {landlords.length > 1 ? (
                <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
                  Landlord {index + 1}
                </p>
              ) : null}
              <ContactBlock
                name={landlord.name}
                email={landlord.email}
                phone={landlord.phone}
              />
            </div>
          ))}
        </div>
      </InfoPanel>

      <InfoPanel title="History" icon={History}>
        <TenancyHistorySection
          propertyId={propertyId}
          records={leasing}
          compact
          onViewAll={onViewHistory}
        />
      </InfoPanel>
    </div>
  );
}
