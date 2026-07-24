'use client';

import { ContactTile } from '@/components/agent/property-contact-tile';
import type { ArchivedLandlordRecord } from '@/lib/property-archive';
import { derivePaymentCycle } from '@/lib/property-overview';
import { formatCurrency, formatDate } from '@/lib/utils';

function OverviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-3">
      <h3 className="mb-2 text-xs font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-2.5 py-2">
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatManagementRate(
  percent?: number,
  gst?: string,
): string {
  if (percent == null) return '—';
  const gstLabel =
    gst === 'include' ? 'Include GST' : gst === 'exclude' ? 'Exclude GST' : '';
  return `${percent}%${gstLabel ? ` · ${gstLabel}` : ''}`;
}

function formatBond(amount?: number): string {
  if (amount == null || amount <= 0) return '—';
  return formatCurrency(amount);
}

function formatRoutineCadenceLine(
  frequency?: number,
  frequencyMonths?: number,
): string | null {
  const parts: string[] = [];
  if (frequency != null) parts.push(`${frequency}× per year`);
  if (frequencyMonths != null) parts.push(`Every ${frequencyMonths} months`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function NextRoutineStatValue({
  date,
  frequency,
  frequencyMonths,
}: {
  date?: string;
  frequency?: number;
  frequencyMonths?: number;
}) {
  const cadence = formatRoutineCadenceLine(frequency, frequencyMonths);
  return (
    <div>
      <p className="text-sm font-semibold tabular-nums">
        {date ? formatDate(date) : '—'}
      </p>
      {cadence ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] font-normal leading-snug">
          {cadence}
        </p>
      ) : null}
    </div>
  );
}

export function ArchivedLandlordOverview({
  landlord,
}: {
  landlord: ArchivedLandlordRecord;
}) {
  const overview = landlord.overview;
  const tenantName = overview?.tenantName?.trim() || 'Vacant';
  const rentWeekly = overview?.currentRentWeekly ?? 0;
  const managementRatePercent =
    landlord.managementRatePercent ?? overview?.managementRatePercent;
  const managementRateGst = landlord.managementRateGst ?? overview?.managementRateGst;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Property overview as at{' '}
        {landlord.archivedAt ? formatDate(landlord.archivedAt.slice(0, 10)) : 'archive date'}.
      </p>

      <OverviewSection title="Tenancy">
        <ContactTile
          title="Tenant"
          layout="row"
          name={tenantName}
          email={overview?.tenantEmail}
          phone={overview?.tenantPhone}
        />
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell
            label="Rent paid to"
            value={
              overview?.rentPaidUntilDate ? formatDate(overview.rentPaidUntilDate) : '—'
            }
          />
          <StatCell label="Payment cycle" value={derivePaymentCycle(rentWeekly)} />
          <StatCell label="Bond" value={formatBond(overview?.bondAmount)} />
          <StatCell
            label="Next rent review"
            value={
              overview?.nextRentReviewDate ? formatDate(overview.nextRentReviewDate) : '—'
            }
          />
          <StatCell
            label="Lease start"
            value={
              overview?.leaseStartDate ?? landlord.leaseStartDate
                ? formatDate(overview?.leaseStartDate ?? landlord.leaseStartDate ?? '')
                : '—'
            }
          />
          <StatCell
            label="Lease end"
            value={
              overview?.leaseEndDate ?? landlord.leaseEndDate
                ? formatDate(overview?.leaseEndDate ?? landlord.leaseEndDate ?? '')
                : '—'
            }
          />
          <StatCell
            label="Vacate date"
            value={overview?.vacateDate ? formatDate(overview.vacateDate) : '—'}
          />
          <StatCell
            label="Next routine"
            value={
              <NextRoutineStatValue
                date={overview?.nextRoutineInspectionDate}
                frequency={overview?.routineInspectionFrequency}
                frequencyMonths={overview?.routineInspectionFrequencyMonths}
              />
            }
          />
        </div>
      </OverviewSection>

      <OverviewSection title="Management details">
        <ContactTile
          title="Landlord"
          layout="row"
          name={landlord.name}
          email={landlord.email}
          phone={landlord.phone}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatCell
            label="Management rate"
            value={formatManagementRate(managementRatePercent, managementRateGst)}
          />
          <StatCell
            label="Weekly rent"
            value={rentWeekly > 0 ? `${formatCurrency(rentWeekly)}/wk` : '—'}
          />
        </div>
      </OverviewSection>
    </div>
  );
}
