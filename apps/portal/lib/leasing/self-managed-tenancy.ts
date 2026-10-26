import {
  AGENCY_TENANCY_LEASE_TYPE,
  AGENCY_TENANCY_RENT_PERIOD,
  CREATE_TENANCY_COPY,
  type AgencyTenancyLeaseType,
  type AgencyTenancyRentPeriod,
} from '@/constants/self-managed-tenancy';
import type {
  CreateSelfManagedTenancyInput,
  SelfManagedTenancyParty,
} from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export type TenancyTenantForm = { name: string; email: string; phone: string };

export type CreateTenancyForm = {
  tenants: TenancyTenantForm[];
  leaseStartDate: string;
  leaseType: AgencyTenancyLeaseType;
  leaseEndDate: string;
  rentAmount: string;
  rentPeriod: AgencyTenancyRentPeriod;
  bond: string;
  notes: string;
};

export const EMPTY_TENANCY_TENANT: TenancyTenantForm = { name: '', email: '', phone: '' };

const dateInput = (iso: string | undefined): string => (iso ? iso.slice(0, 10) : '');
const amountInput = (amount: number | undefined): string =>
  amount != null && amount > 0 ? String(amount) : '';

/** The form, prefilled from the letting's asking rent, bond and move-in date. */
export function createTenancyFormFrom(detail: LeasingPropertyDetail): CreateTenancyForm {
  return {
    tenants: [{ ...EMPTY_TENANCY_TENANT }],
    leaseStartDate: dateInput(detail.rental.moveInDate ?? detail.rental.availableFrom),
    leaseType: AGENCY_TENANCY_LEASE_TYPE.FIXED,
    leaseEndDate: '',
    rentAmount: amountInput(detail.rental.rentPerWeek),
    rentPeriod: AGENCY_TENANCY_RENT_PERIOD.WEEKLY,
    bond: amountInput(detail.rental.bond),
    notes: '',
  };
}

function isBlankTenant(tenant: TenancyTenantForm): boolean {
  return !tenant.name.trim() && !tenant.email.trim() && !tenant.phone.trim();
}

function toParty(tenant: TenancyTenantForm): SelfManagedTenancyParty {
  const email = tenant.email.trim();
  const phone = tenant.phone.trim();
  return {
    name: tenant.name.trim(),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

/**
 * The request body, or the first thing the agent still has to fix. Blank co-tenant rows are
 * dropped; the server re-checks every rule.
 */
export function buildCreateTenancyInput(
  form: CreateTenancyForm,
): { input: CreateSelfManagedTenancyInput } | { error: string } {
  const tenants = form.tenants.filter((tenant, index) => index === 0 || !isBlankTenant(tenant));
  const [primary] = tenants;
  if (!primary?.name.trim()) return { error: CREATE_TENANCY_COPY.errors.primaryName };
  if (!primary.email.trim() && !primary.phone.trim()) {
    return { error: CREATE_TENANCY_COPY.errors.primaryContact };
  }
  if (tenants.some((tenant) => !tenant.name.trim())) {
    return { error: CREATE_TENANCY_COPY.errors.coTenantName };
  }

  const start = form.leaseStartDate.trim();
  if (!start) return { error: CREATE_TENANCY_COPY.errors.startDate };
  const fixed = form.leaseType === AGENCY_TENANCY_LEASE_TYPE.FIXED;
  const end = form.leaseEndDate.trim();
  if (fixed && !end) return { error: CREATE_TENANCY_COPY.errors.endDate };
  if (fixed && end <= start) return { error: CREATE_TENANCY_COPY.errors.endBeforeStart };

  const rent = parseAmount(form.rentAmount);
  if (rent === null || Number.isNaN(rent) || rent <= 0) {
    return { error: CREATE_TENANCY_COPY.errors.rent };
  }
  const bond = parseAmount(form.bond);
  if (bond !== null && (Number.isNaN(bond) || bond < 0)) {
    return { error: CREATE_TENANCY_COPY.errors.bond };
  }

  const notes = form.notes.trim();
  return {
    input: {
      tenants: tenants.map(toParty),
      leaseStartDate: start,
      leaseType: form.leaseType,
      ...(fixed ? { leaseEndDate: end } : {}),
      rentAmount: rent,
      rentPeriod: form.rentPeriod,
      ...(bond !== null ? { bond } : {}),
      ...(notes ? { notes } : {}),
    },
  };
}

/** True when an applicant on the letting is already approved — their onboarding finishes it. */
export function hasApprovedApplicant(detail: LeasingPropertyDetail): boolean {
  return (detail.applicationsDetail ?? []).some(
    (app) => app.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );
}

export type RecordedTenancySummary = {
  tenantNames: string[];
  weeklyRent?: number;
  bond?: number;
  leaseTerm?: string;
  startDate?: string;
  endDate?: string;
};

/** What the agency recorded, read back from the closed letting. */
export function recordedTenancySummary(detail: LeasingPropertyDetail): RecordedTenancySummary {
  const contract = detail.onboarding.agreement.contract;
  return {
    tenantNames: (detail.applicationsDetail ?? [])
      .filter((app) => app.agentDecision === LEASING_AGENT_DECISION.APPROVED)
      .map((app) => app.applicant),
    weeklyRent: contract.weeklyRent ?? detail.rental.rentPerWeek,
    bond: contract.bond ?? detail.rental.bond,
    leaseTerm: contract.leaseTerm || detail.rental.leaseTerm,
    startDate: contract.startDate ?? detail.rental.moveInDate,
    endDate: contract.endDate,
  };
}
