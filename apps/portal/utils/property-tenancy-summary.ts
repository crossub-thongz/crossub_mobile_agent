import type { TenancyLeaseTermType } from '@/constants/property-tenancies';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import type { TenancyArchiveSnapshot } from '@/lib/property-archive';
import type { HouseholdTenant } from '@/lib/property-parties';

/**
 * The current tenancy as the CROSSUB admin Property page shows it. Every value is read from the
 * tenancy overview, which the API builds with the same code as the admin page, so the two
 * portals cannot disagree on tenant, lease term, rent, rent review or bond.
 */
export interface PropertyTenancySummary {
  vacant: boolean;
  tenants: HouseholdTenant[];
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTermType: TenancyLeaseTermType | null;
  rentWeekly: number | null;
  nextRentReviewDate?: string;
  bondAmount: number | null;
  previousTenancies: TenancyArchiveSnapshot[];
}

function filled(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function currentTenants(record: PropertyTenancyOverview): HouseholdTenant[] {
  const tenant = record.tenant;
  const primaryName = filled(tenant?.name);
  if (!tenant || !primaryName) return [];
  const primary: HouseholdTenant = {
    id: tenant.personId ?? undefined,
    name: primaryName,
    email: filled(tenant.email),
    phone: filled(tenant.mobile),
    isPrimary: true,
  };
  const others = tenant.coTenants.flatMap((coTenant): HouseholdTenant[] => {
    const name = filled(coTenant.name);
    if (!name) return [];
    return [
      {
        id: coTenant.personId ?? coTenant.id,
        name,
        email: filled(coTenant.email),
        phone: filled(coTenant.mobile),
        isPrimary: false,
      },
    ];
  });
  return [primary, ...others];
}

function previousTenancies(record: PropertyTenancyOverview): TenancyArchiveSnapshot[] {
  return record.archivedTenancies
    .filter((archived) => !archived.withdrawnBeforeStart)
    .map((archived) => ({
      tenantName: filled(archived.tenantName),
      tenantEmail: filled(archived.email),
      tenantPhone: filled(archived.mobile),
      leaseStartDate: filled(archived.leaseStartDate),
      leaseEndDate: filled(archived.leaseEndDate),
      vacateDate: filled(archived.vacateDate),
      bondAmount: archived.bondAmount ?? undefined,
      archivedAt: archived.archivedAt,
    }));
}

export function summarisePropertyTenancy(record: PropertyTenancyOverview): PropertyTenancySummary {
  const tenants = currentTenants(record);
  return {
    vacant: tenants.length === 0,
    tenants,
    leaseStartDate: filled(record.overview.leaseStartDate),
    leaseEndDate: filled(record.overview.leaseEndDate),
    leaseTermType: record.overview.leaseTermType,
    rentWeekly: record.financial.currentRentWeekly,
    nextRentReviewDate: filled(record.overview.nextRentReviewDate),
    bondAmount: record.financial.bondAmount,
    previousTenancies: previousTenancies(record),
  };
}
