import { api } from '@/lib/api';
import { updateProperty } from '@/lib/crossub-api/agent-client';

/** Full property row from `GET /properties/{id}` — includes building contacts + parking. */
export interface PropertyRecord {
  id: string;
  parking: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  buildingName?: string | null;
  strataPlanNumber?: string | null;
  landlordInsuranceExpiry?: string | null;
  administrationFee?: number | null;
  documentationFee?: number | null;
  lettingFee?: number | null;
  managementRatePercent?: number | null;
  managementRateGst?: string | null;
  landlordName: string | null;
  landlordEmail: string | null;
  landlordPhone: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  buildingManagerName: string | null;
  buildingManagerEmail: string | null;
  buildingManagerPhone: string | null;
  strataContactName: string | null;
  strataContactEmail: string | null;
  strataContactPhone: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  nextRentReviewAt: string | null;
  lastRentIncreaseAt: string | null;
  rentPaidUntil: string | null;
  rentWeekly: number | null;
  bondAmount: number | null;
  depositAmount: number | null;
  vacateDate: string | null;
  nextInspectionAt: string | null;
  updatedAt: string;
}

export interface PropertyContactBlock {
  name?: string;
  email?: string;
  mobile?: string;
}

export interface PropertyPortalOverview {
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTermType?: 'fixed' | 'periodic';
  nextRentReviewDate?: string;
  lastRentIncreaseDate?: string;
  rentPaidUntilDate?: string;
  vacateDate?: string;
  nextRoutineInspectionDate?: string;
  furnished?: boolean;
  buildingName?: string;
  strataPlanNumber?: string;
  latitude?: number;
  longitude?: number;
  landlordInsuranceExpiry?: string;
  administrationFee?: number;
  documentationFee?: number;
  lettingFee?: number;
  managementRatePercent?: number;
  managementRateGst?: 'include' | 'exclude';
  endOfManagementDate?: string;
  buildingManager?: PropertyContactBlock;
  strataContact?: PropertyContactBlock;
}

export interface PropertyPortalFinancial {
  currentRentWeekly?: number;
  bondAmount?: number;
  depositAmount?: number;
  outstandingRent?: number;
}

export interface PropertyPortalLedgerEntry {
  id: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  description: string;
}

export interface PropertyPortalDebtCollectionEvent {
  id: string;
  channel: 'email' | 'sms' | 'phone' | 'reminder';
  timestamp: string;
  summary: string;
}

export interface PropertyPortalStatement {
  id: string;
  month: string;
  amount: number;
}

export interface PropertyPortalDocument {
  id: string;
  category:
    | 'management_agreement'
    | 'strata'
    | 'insurance'
    | 'lease'
    | 'application'
    | 'inspection_report'
    | 'quotation'
    | 'invoice'
    | 'statement'
    | 'tribunal';
  title: string;
  uploadedAt: string;
  url?: string;
  inspectionId?: string;
}

export interface PropertyPortalAccounting {
  ledger: PropertyPortalLedgerEntry[];
  outstandingRentDays?: number;
  outstandingRentAmount?: number;
  debtCollection: PropertyPortalDebtCollectionEvent[];
  statements: PropertyPortalStatement[];
}

export interface PropertyPortalPayload {
  overview?: PropertyPortalOverview;
  financial?: PropertyPortalFinancial;
  accounting?: PropertyPortalAccounting;
  documents?: PropertyPortalDocument[];
}

export type PropertyPortalDetail = PropertyPortalPayload;

export type PropertyRegistryPatch = Partial<{
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  rentWeekly: number;
  leaseStartDate: string;
  leaseEndDate: string;
  nextRentReviewAt: string;
  rentPaidUntil: string;
  vacateDate: string;
  vacateDateChangeReason?: string;
  nextInspectionAt: string;
  bondAmount: number;
  landlordInsuranceExpiry: string;
  managementRatePercent: number;
  managementRateGst: 'include' | 'exclude';
  replaceLandlord?: boolean;
  buildingManagerName: string;
  buildingManagerEmail: string;
  buildingManagerPhone: string;
  strataContactName: string;
  strataContactEmail: string;
  strataContactPhone: string;
}>;

export const propertyRegistryApi = {
  get: (propertyId: string): Promise<PropertyRecord> =>
    api.get<{ property: PropertyRecord }>(`/properties/${propertyId}`).then((r) => r.property),

  getPortal: (propertyId: string): Promise<PropertyPortalPayload> =>
    api
      .get<{ portal: PropertyPortalPayload }>(`/properties/${propertyId}/portal`)
      .then((r) => r.portal),

  getPortalDetail: (propertyId: string): Promise<PropertyPortalDetail> =>
    api
      .get<{ portal: PropertyPortalDetail }>(`/properties/${propertyId}/portal`)
      .then((r) => r.portal),

  update: async (
    propertyId: string,
    patch: PropertyRegistryPatch,
  ): Promise<PropertyRecord> => {
    await updateProperty(propertyId, patch);
    return api
      .get<{ property: PropertyRecord }>(`/properties/${propertyId}`)
      .then((r) => r.property);
  },
};
