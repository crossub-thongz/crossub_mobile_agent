import type { CreatePropertyDocumentGroup } from '@/lib/property-create-document-groups';
import type { LeasingRecord, Property, VacatingCase } from '@/lib/types';

export interface ArchivedLandlordOverviewSnapshot {
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  nextRentReviewDate?: string;
  rentPaidUntilDate?: string;
  vacateDate?: string;
  nextRoutineInspectionDate?: string;
  currentRentWeekly?: number;
  bondAmount?: number;
  depositAmount?: number;
  managementRatePercent?: number;
  managementRateGst?: string;
}

export interface ArchivedLandlordRecord {
  name: string;
  email?: string;
  phone?: string;
  managementRatePercent?: number;
  managementRateGst?: string;
  archivedAt: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  overview?: ArchivedLandlordOverviewSnapshot;
}

export interface TenancyArchiveSnapshot {
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  vacateDate?: string;
  rentPaidUntil?: string;
  bondAmount?: number;
  archivedAt: string;
  source?: 'vacate_date' | 'end_leasing_complete';
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function sliceDate(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

function parseRegistryDraft(registryDraft: unknown): Record<string, unknown> {
  if (registryDraft != null && typeof registryDraft === 'object' && !Array.isArray(registryDraft)) {
    return registryDraft as Record<string, unknown>;
  }
  return {};
}

function parseArchivedLandlordOverview(
  value: unknown,
): ArchivedLandlordOverviewSnapshot | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const overview: ArchivedLandlordOverviewSnapshot = {
    tenantName: typeof item.tenantName === 'string' ? item.tenantName : undefined,
    tenantEmail: typeof item.tenantEmail === 'string' ? item.tenantEmail : undefined,
    tenantPhone: typeof item.tenantPhone === 'string' ? item.tenantPhone : undefined,
    leaseStartDate: typeof item.leaseStartDate === 'string' ? item.leaseStartDate : undefined,
    leaseEndDate: typeof item.leaseEndDate === 'string' ? item.leaseEndDate : undefined,
    nextRentReviewDate:
      typeof item.nextRentReviewDate === 'string' ? item.nextRentReviewDate : undefined,
    rentPaidUntilDate:
      typeof item.rentPaidUntilDate === 'string' ? item.rentPaidUntilDate : undefined,
    vacateDate: typeof item.vacateDate === 'string' ? item.vacateDate : undefined,
    nextRoutineInspectionDate:
      typeof item.nextRoutineInspectionDate === 'string'
        ? item.nextRoutineInspectionDate
        : undefined,
    currentRentWeekly:
      typeof item.currentRentWeekly === 'number' ? item.currentRentWeekly : undefined,
    bondAmount: typeof item.bondAmount === 'number' ? item.bondAmount : undefined,
    depositAmount: typeof item.depositAmount === 'number' ? item.depositAmount : undefined,
    managementRatePercent:
      typeof item.managementRatePercent === 'number' ? item.managementRatePercent : undefined,
    managementRateGst:
      typeof item.managementRateGst === 'string' ? item.managementRateGst : undefined,
  };
  return Object.values(overview).some((v) => v != null) ? overview : undefined;
}

export function archivedLandlordKey(archivedAt: string): string {
  return encodeURIComponent(archivedAt);
}

export function findArchivedLandlord(
  registryDraft: unknown,
  archiveKey: string,
): ArchivedLandlordRecord | undefined {
  const decoded = decodeURIComponent(archiveKey);
  return parseArchivedLandlords(registryDraft).find((item) => item.archivedAt === decoded);
}

export function parseArchivedLandlords(registryDraft: unknown): ArchivedLandlordRecord[] {
  const draft = parseRegistryDraft(registryDraft);
  const raw = draft.archivedLandlords;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      email: typeof item.email === 'string' ? item.email : undefined,
      phone: typeof item.phone === 'string' ? item.phone : undefined,
      managementRatePercent:
        typeof item.managementRatePercent === 'number' ? item.managementRatePercent : undefined,
      managementRateGst:
        typeof item.managementRateGst === 'string' ? item.managementRateGst : undefined,
      archivedAt: typeof item.archivedAt === 'string' ? item.archivedAt : '',
      leaseStartDate: typeof item.leaseStartDate === 'string' ? item.leaseStartDate : undefined,
      leaseEndDate: typeof item.leaseEndDate === 'string' ? item.leaseEndDate : undefined,
      overview: parseArchivedLandlordOverview(item.overview),
    }))
    .filter((item) => item.name.length > 0)
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}

export function parseTenancyArchiveSnapshots(registryDraft: unknown): TenancyArchiveSnapshot[] {
  const draft = parseRegistryDraft(registryDraft);
  const raw = draft.tenancyArchives;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      tenantName: typeof item.tenantName === 'string' ? item.tenantName : undefined,
      tenantEmail: typeof item.tenantEmail === 'string' ? item.tenantEmail : undefined,
      tenantPhone: typeof item.tenantPhone === 'string' ? item.tenantPhone : undefined,
      leaseStartDate: typeof item.leaseStartDate === 'string' ? item.leaseStartDate : undefined,
      leaseEndDate: typeof item.leaseEndDate === 'string' ? item.leaseEndDate : undefined,
      vacateDate: typeof item.vacateDate === 'string' ? item.vacateDate : undefined,
      rentPaidUntil: typeof item.rentPaidUntil === 'string' ? item.rentPaidUntil : undefined,
      bondAmount: typeof item.bondAmount === 'number' ? item.bondAmount : undefined,
      archivedAt: typeof item.archivedAt === 'string' ? item.archivedAt : '',
      source:
        item.source === 'vacate_date' || item.source === 'end_leasing_complete'
          ? (item.source as TenancyArchiveSnapshot['source'])
          : undefined,
    }))
    .filter((item) => item.archivedAt.length > 0)
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}

/** Active end-leasing cases for the property (not cancelled). */
export function activeVacatingCases(vacatingCases: VacatingCase[]): VacatingCase[] {
  return vacatingCases.filter((c) => c.apiStatus !== 'CANCELLED');
}

/**
 * Tenancy is archived (read-only) once the vacate date has passed while end-leasing is
 * active, or when the lease has ended / end-leasing completed.
 */
export function isTenancyArchived({
  property,
  vacatingCases,
  currentLease,
}: {
  property: Property;
  vacatingCases: VacatingCase[];
  currentLease?: LeasingRecord;
}): boolean {
  const today = todayIsoDate();
  const active = activeVacatingCases(vacatingCases);
  const vacateDate =
    sliceDate(active[0]?.vacateDate) ||
    sliceDate(property.vacateDate) ||
    sliceDate(currentLease?.leaseEnd);

  const vacateDateReached = Boolean(vacateDate && vacateDate <= today);
  const completedEndLeasing = active.some((c) => c.apiStatus === 'COMPLETED');
  const leaseEnded = currentLease?.status === 'ended';

  if (completedEndLeasing || leaseEnded) return true;
  if (vacateDateReached && active.length > 0) return true;
  return false;
}

export function archivedDocumentGroups(tenancyArchived: boolean): CreatePropertyDocumentGroup[] {
  if (!tenancyArchived) return [];
  return ['tenancy', 'tenant_application'];
}
