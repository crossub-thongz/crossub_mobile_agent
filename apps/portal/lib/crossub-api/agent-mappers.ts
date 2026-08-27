/**
 * Pure adapters from the typed CROSSUB agent-facade DTOs (`@crossub-thongz/api-contract`)
 * to the view-models the agent screens already render (`lib/types.ts`). Keeping the
 * translation here means the screens stay agnostic about where their data came from — the
 * provider swaps demo seeds for these mapped results with no component changes.
 *
 * Every DTO is a THIN projection of the real Prisma row, so view-model fields the facade
 * does not carry (timelines, checklists, image comparisons, collection activity) land on
 * safe empty defaults — the same shape the screens already tolerate for demo data. The
 * agent DTOs type their nullable scalars as `T | null` (the contract fix-at-source), so a
 * plain `?? fallback` is enough — no typeof guard needed.
 */
import type {
  AgentAccounting,
  AgentAgency,
  AgentDocumentDto,
  AgentInspection,
  AgentLeasing,
  AgentLeasingCycle,
  AgentMaintenance,
  AgentMessageThread,
  AgentNotificationDto,
  AgentProperty,
  AgentRentReview,
  AgentTenantSelection,
  AgentThreadMessage,
  AgentTribunal,
  AgentVacating,
  AgentArchive,
} from './agent-client';
import {
  AGENT_NOTIFICATION_TYPE,
  APPLICATION_STATUS,
  COMM_CHANNEL,
  COMM_DEPARTMENT,
  INSPECTION_STATUS,
  INSPECTION_TYPE,
  LEASE_STATUS,
  MAINTENANCE_STATUS,
  PROPERTY_APPROVAL_STATUS,
  RENT_REVIEW_WORKFLOW_STATE,
  TRIBUNAL_CASE_STATUS,
  VACATING_STATUS,
} from '@/constants/api-enums';
import type { PropertyApprovalStatus } from '@/constants/api-enums';
import { agentDocumentFileHref } from '@/lib/document-preview';
import { toPlainTextBody } from '@/lib/message-body';
import { maintenanceReferenceLabel } from '@/lib/workflow-case-reference';
import { TENANT_REJECTED_LABEL } from '@/lib/maintenance/tenant-rejected';
import { formatPropertyFullAddress } from '@/lib/utils';
import { hasLeftTaskPool } from '@/lib/inspection-approval';
import { AGENT_INGOING_GATE_LABEL, deriveAgentIngoingGateStatus } from '@/lib/ingoing-inspection-display';
import { AGENT_OUTGOING_GATE_LABEL, deriveAgentOutgoingGateStatus } from '@/lib/outgoing-inspection-display';
import type {
  AgencyMembershipTier,
  AgentArchiveView,
  ArchivedEndLeasingCase,
  ArchivedLeasingCycle,
  ArchivedRentReview,
  Agency,
  AgentDocument,
  AgentNotification,
  Inspection,
  LeasingRecord,
  LeasingCycle,
  MaintenanceRequest,
  MessageCategory,
  MessageThread,
  Priority,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  ThreadMessage,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import type { AgentPortfolioId } from '@/lib/agent-scope';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import { formatInspectorReassignmentLabel } from '@/lib/inspector-reassignment-label';

type ExtendedAgentProperty = AgentProperty & {
  state?: string | null;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  buildingName?: string | null;
  strataPlanNumber?: string | null;
  landlordInsuranceExpiry?: string | null;
  administrationFee?: number | null;
  documentationFee?: number | null;
  lettingFee?: number | null;
  managementRatePercent?: number | null;
  managementRateGst?: 'include' | 'exclude' | null;
  managementFees?: Array<{
    id: string;
    feeType: string;
    valueMode: 'rate' | 'amount';
    amount: string;
    gst: '' | 'include' | 'exclude';
  }> | null;
  buildingManagerName?: string | null;
  buildingManagerEmail?: string | null;
  buildingManagerPhone?: string | null;
  strataContactName?: string | null;
  strataContactEmail?: string | null;
  strataContactPhone?: string | null;
  createdAt?: string;
  agencyName?: string | null;
  propertyManager?: string | null;
  propertyManagerId?: string | null;
  endOfManagementDate?: string | null;
  registryIntakeComplete?: boolean | null;
  approvalStatus?: PropertyApprovalStatus | null;
  approvalRequestedAt?: string | null;
  approvalDecidedAt?: string | null;
  approvalDeclineReason?: string | null;
  registryDraft?: Record<string, unknown> | null;
  vacateDate?: string | null;
  nextRentReviewAt?: string | null;
  rentPaidUntil?: string | null;
  paymentReference?: string | null;
};

function readFurnished(dto: AgentProperty): boolean | undefined {
  const value = (dto as AgentProperty & { furnished?: boolean | null }).furnished;
  return typeof value === 'boolean' ? value : undefined;
}

function readExtended(dto: AgentProperty): ExtendedAgentProperty {
  return dto as ExtendedAgentProperty;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

type AgentPropertyListFields = {
  createdAt?: string | null;
  agencyName?: string | null;
  propertyManager?: string | null;
  propertyManagerId?: string | null;
  endOfManagementDate?: string | null;
  registryIntakeComplete?: boolean | null;
  approvalStatus?: PropertyApprovalStatus | null;
  approvalRequestedAt?: string | null;
  approvalDecidedAt?: string | null;
  approvalDeclineReason?: string | null;
  registryDraft?: Record<string, unknown> | null;
  vacateDate?: string | null;
  nextRentReviewAt?: string | null;
  rentPaidUntil?: string | null;
};

function readListFields(dto: AgentProperty): AgentPropertyListFields {
  return dto as AgentProperty & AgentPropertyListFields;
}

/** Map one enriched property card onto the app's rich Property view-model. */
export function mapAgentProperty(
  dto: AgentProperty,
  agentId: AgentPortfolioId,
): Property {
  const ext = readExtended(dto);
  const list = readListFields(dto);
  return {
    id: dto.id,
    agencyId: dto.agencyId,
    address: dto.address ?? '',
    suburb: dto.suburb ?? '',
    state: ext.state ?? undefined,
    postcode: ext.postcode ?? undefined,
    homeOwnerName: dto.landlordName ?? '—',
    homeOwnerContact: {
      email: dto.landlordEmail ?? undefined,
      phone: dto.landlordPhone ?? undefined,
    },
    assignedAgentId: agentId,
    tenantName: dto.tenantName ?? '—',
    tenantContact: {
      email: dto.tenantEmail ?? undefined,
      phone: dto.tenantPhone ?? undefined,
    },
    leaseStatus: dto.leaseStatus,
    rentWeekly: dto.rentWeekly ?? 0,
    bondAmount: dto.bondAmount ?? undefined,
    bedrooms: dto.bedrooms ?? undefined,
    bathrooms: dto.bathrooms ?? undefined,
    carSpaces: dto.parking != null ? dto.parking : undefined,
    furnished: readFurnished(dto),
    propertyType: dto.propertyType,
    latitude: ext.latitude ?? undefined,
    longitude: ext.longitude ?? undefined,
    buildingName: ext.buildingName ?? undefined,
    strataPlanNumber: ext.strataPlanNumber ?? undefined,
    buildingManagerName: ext.buildingManagerName ?? undefined,
    buildingManagerEmail: ext.buildingManagerEmail ?? undefined,
    buildingManagerPhone: ext.buildingManagerPhone ?? undefined,
    strataContactName: ext.strataContactName ?? undefined,
    strataContactEmail: ext.strataContactEmail ?? undefined,
    strataContactPhone: ext.strataContactPhone ?? undefined,
    landlordInsuranceExpiry: ext.landlordInsuranceExpiry ?? undefined,
    administrationFee: ext.administrationFee ?? undefined,
    documentationFee: ext.documentationFee ?? undefined,
    lettingFee: ext.lettingFee ?? undefined,
    managementFees: Array.isArray(ext.managementFees) ? ext.managementFees : undefined,
    managementRatePercent: ext.managementRatePercent ?? undefined,
    managementRateGst:
      ext.managementRateGst === 'include' || ext.managementRateGst === 'exclude'
        ? ext.managementRateGst
        : undefined,
    leaseStart: dto.leaseStart ?? undefined,
    leaseEnd: dto.leaseEnd ?? undefined,
    createdAt: list.createdAt ?? ext.createdAt ?? undefined,
    agencyName: list.agencyName ?? ext.agencyName ?? undefined,
    propertyManager: list.propertyManager ?? ext.propertyManager ?? undefined,
    propertyManagerId: list.propertyManagerId ?? ext.propertyManagerId ?? undefined,
    endOfManagementDate: list.endOfManagementDate ?? ext.endOfManagementDate ?? undefined,
    registryIntakeComplete:
      list.registryIntakeComplete ?? ext.registryIntakeComplete ?? true,
    // Defaults to APPROVED, never PENDING: an API that predates the gate omits the field,
    // and guessing PENDING there would lock every workflow in the app on a property the
    // server would happily accept work on.
    approvalStatus:
      list.approvalStatus ??
      ext.approvalStatus ??
      PROPERTY_APPROVAL_STATUS.APPROVED,
    approvalRequestedAt:
      list.approvalRequestedAt ?? ext.approvalRequestedAt ?? undefined,
    approvalDecidedAt: list.approvalDecidedAt ?? ext.approvalDecidedAt ?? undefined,
    approvalDeclineReason:
      list.approvalDeclineReason ?? ext.approvalDeclineReason ?? undefined,
    registryDraft: list.registryDraft ?? ext.registryDraft ?? null,
    vacateDate:
      (dto as AgentProperty & { vacateDate?: string | null }).vacateDate ??
      list.vacateDate ??
      ext.vacateDate ??
      undefined,
    nextRentReview:
      (dto as AgentProperty & { nextRentReviewAt?: string | null }).nextRentReviewAt?.slice(0, 10) ??
      list.nextRentReviewAt?.slice(0, 10) ??
      ext.nextRentReviewAt?.slice(0, 10) ??
      undefined,
    rentPaidUntil:
      (dto as AgentProperty & { rentPaidUntil?: string | null }).rentPaidUntil ??
      list.rentPaidUntil ??
      ext.rentPaidUntil ??
      undefined,
    paymentReference:
      (dto as AgentProperty & { paymentReference?: string | null }).paymentReference ??
      (list as AgentPropertyListFields & { paymentReference?: string | null })
        .paymentReference ??
      ext.paymentReference ??
      undefined,
    openTasks: 0,
    inspectionStatus: '—',
    maintenanceStatus: '—',
    accountManagerName: dto.accountManagerName ?? undefined,
    accountManagerEmail: dto.accountManagerEmail ?? undefined,
    accountManagerPhone: dto.accountManagerPhone ?? undefined,
    accountManagerExtension: dto.accountManagerExtension ?? undefined,
  };
}

export function mapAgentProperties(
  dtos: AgentProperty[],
  agentId: AgentPortfolioId,
): Property[] {
  return dtos.map((d) => mapAgentProperty(d, agentId));
}

// ---------------------------------------------------------------------------
// Agencies (clients)
// ---------------------------------------------------------------------------

/**
 * The agency DTO's optional contact fields are typed by the *installed* contract as
 * `Record<string, never> | null` (it predates the `type: String` fix-at-source applied to
 * the source DTO), so they're coerced with a typeof guard rather than a plain `?? fallback`
 * — robust whether the resolved contract types them as `string | null` or the older shape.
 */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Map the thin agency DTOs onto the app's `Agency` view-model. `propertyCount` is left at 0
 * here and filled by the provider from the already-live `properties` (grouped by `agencyId`),
 * so the count always agrees with what the Properties screen shows — no extra fetch.
 */
export function mapAgentAgencies(dtos: AgentAgency[]): Agency[] {
  return dtos.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    company: asString(a.company),
    contactName: asString(a.contactName),
    contactEmail: asString(a.contactEmail),
    contactPhone: asString(a.contactPhone),
    portalServiceLevel:
      typeof a.portalServiceLevel === 'string'
        ? (a.portalServiceLevel as Agency['portalServiceLevel'])
        : 'LEVEL_2_FULL_MANAGEMENT',
    membershipTier:
      (a as { membershipTier?: AgencyMembershipTier }).membershipTier ?? 'PRINCIPAL',
    propertyCount: 0,
    abn: asString(a.abn),
    licenceNumber: asString(a.licenceNumber),
    bankName: asString(a.bankName),
    bankAccountName: asString(a.bankAccountName),
    bankBsb: asString(a.bankBsb),
    bankAccountNumber: asString(a.bankAccountNumber),
    accountManagerName: asString(a.accountManagerName),
    accountManagerEmail: asString(a.accountManagerEmail),
    accountManagerPhone: asString(a.accountManagerPhone),
    accountManagerExtension: asString(a.accountManagerExtension),
  }));
}

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

const INSPECTION_TYPE_VIEW: Record<AgentInspection['type'], Inspection['type']> =
  {
    [INSPECTION_TYPE.INGOING]: 'INGOING',
    [INSPECTION_TYPE.OUTGOING]: 'OUTGOING',
    [INSPECTION_TYPE.OPEN]: 'OPEN',
    [INSPECTION_TYPE.ROUTINE]: 'ROUTINE',
    [INSPECTION_TYPE.CONDITION]: 'ROUTINE',
    [INSPECTION_TYPE.WARD_ROUND]: 'ROUTINE',
  };

const INSPECTION_STATUS_LABEL: Record<AgentInspection['status'], string> = {
  [INSPECTION_STATUS.DRAFT]: 'Scheduled',
  [INSPECTION_STATUS.IN_PROGRESS]: 'In progress',
  [INSPECTION_STATUS.FIRST_REVIEW]: 'In review',
  [INSPECTION_STATUS.SECOND_REVIEW]: 'In review',
  [INSPECTION_STATUS.COMPLETED]: 'Completed',
  [INSPECTION_STATUS.PUBLISHED]: 'Published',
  [INSPECTION_STATUS.CANCELLED]: 'Cancelled',
};

function inspectionStatusLabel(dto: AgentInspection): string {
  if (dto.unacceptedRefunded) return 'Refunded';
  const type = INSPECTION_TYPE_VIEW[dto.type] ?? 'ROUTINE';
  if (type === 'OPEN' && dto.status === INSPECTION_STATUS.CANCELLED) return 'Deleted';
  return INSPECTION_STATUS_LABEL[dto.status] ?? dto.status;
}

function inspectionReportStatus(
  dto: AgentInspection,
): Inspection['reportStatus'] {
  if (dto.status === INSPECTION_STATUS.PUBLISHED) return 'sent';
  if (dto.status === INSPECTION_STATUS.COMPLETED) {
    if (
      hasLeftTaskPool({
        completedAt: dto.completedDate,
        approvedAt: dto.approvedAt,
      })
    ) {
      return 'approved';
    }
    return dto.reportUrl ? 'uploaded' : 'pending';
  }
  return dto.reportUrl ? 'uploaded' : 'pending';
}

export function mapAgentInspections(dtos: AgentInspection[]): Inspection[] {
  return dtos.map((i) => {
    const type = INSPECTION_TYPE_VIEW[i.type] ?? 'ROUTINE';
    const inspectionRow: Inspection = {
      id: i.id,
      trackingNumber: inspectionReferenceLabel(i.id, type),
      type,
      propertyId: i.propertyId ?? '',
      propertyAddress: i.propertyAddress,
      inspector:
        formatInspectorReassignmentLabel(i.inspectorName, i.previousInspectorName) ??
        undefined,
      scheduledAt: i.scheduledDate ?? i.inspectionDate ?? undefined,
      moveInDate: i.moveInDate ?? undefined,
      status: inspectionStatusLabel(i),
      apiStatus: i.status,
      inspectorConfirmDeadlineAt: i.inspectorConfirmDeadlineAt ?? undefined,
      awaitingAgentPayment: i.awaitingAgentPayment === true,
      unacceptedRefunded: i.unacceptedRefunded === true,
      reportStatus: inspectionReportStatus(i),
      reportUrl: i.reportUrl ?? undefined,
      createdAt: i.createdAt ?? undefined,
      completedAt: i.completedDate ?? undefined,
      approvedAt: i.approvedAt ?? undefined,
      reportDeclineReason: i.reportDeclineReason ?? undefined,
      timeline: [],
      source: 'inspection' as const,
    };
    if (type === 'INGOING') {
      inspectionRow.status =
        AGENT_INGOING_GATE_LABEL[deriveAgentIngoingGateStatus({ inspection: inspectionRow, record: null })];
    } else if (type === 'OUTGOING') {
      inspectionRow.status =
        AGENT_OUTGOING_GATE_LABEL[deriveAgentOutgoingGateStatus({ inspection: inspectionRow, record: null })];
    }
    return inspectionRow;
  });
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

/**
 * A refused tenant-responsibility case the API is holding OPEN.
 *
 * The API no longer closes a case when the tenant disagrees — the fault is still unrepaired and
 * only who pays is contested — so it parks the job and the row keeps an active Prisma status
 * (`SCHEDULED`). Labelling that "In progress" is worse than useless: no work is progressing, and
 * it flatly contradicts the Tenant rejected badge on the same row.
 *
 * Deliberately scoped to open cases. Refusals answered before that change DID close the case, and
 * they are genuinely `COMPLETED` — relabelling those would drag settled history back into the
 * property's active work and out of the Completed filter. They keep their real status and carry
 * the badge, which is the same split the staff console draws.
 */
function isOpenTenantRejectedCase(m: AgentMaintenance): boolean {
  if (m.tenantResponsibilityResponse?.agreed !== false) return false;
  return (
    m.status !== MAINTENANCE_STATUS.COMPLETED && m.status !== MAINTENANCE_STATUS.CANCELLED
  );
}

const MAINTENANCE_STATUS_LABEL: Record<AgentMaintenance['status'], string> = {
  [MAINTENANCE_STATUS.OPEN]: 'Open',
  [MAINTENANCE_STATUS.APPROVED]: 'Approved',
  [MAINTENANCE_STATUS.QUOTING]: 'Quote approval',
  [MAINTENANCE_STATUS.SCHEDULED]: 'In progress',
  [MAINTENANCE_STATUS.INVOICED]: 'Invoiced',
  [MAINTENANCE_STATUS.COMPLETED]: 'Completed',
  [MAINTENANCE_STATUS.CANCELLED]: 'Deleted',
};

function splitAgentMaintenanceDescription(description: string | null | undefined): {
  issueType: string;
  body: string;
} {
  const raw = description?.trim() ?? '';
  const colon = raw.indexOf(':');
  if (colon > 0) {
    return {
      issueType: raw.slice(0, colon).trim(),
      body: raw.slice(colon + 1).trim(),
    };
  }
  return { issueType: '', body: raw };
}

export function mapAgentMaintenance(
  dtos: AgentMaintenance[],
): MaintenanceRequest[] {
  return dtos.map((m) => {
    const priority: Priority = m.urgent ? 'urgent' : 'normal';
    const parsed = splitAgentMaintenanceDescription(m.description);
    const issueType = m.categoryName?.trim() || parsed.issueType || 'General maintenance';
    const body = m.categoryName ? (m.description ?? '') : parsed.body || (m.description ?? '');
    return {
      id: m.id,
      trackingNumber: maintenanceReferenceLabel(m.orderNumber, m.id),
      propertyId: m.propertyId ?? '',
      propertyAddress: m.propertyAddress,
      title: issueType,
      description: body,
      status:
        m.status === MAINTENANCE_STATUS.CANCELLED
          ? 'Deleted'
          : isOpenTenantRejectedCase(m)
            ? TENANT_REJECTED_LABEL
            : (MAINTENANCE_STATUS_LABEL[m.status] ?? m.status),
      apiStatus: m.status,
      priority,
      responsibility: 'pending',
      contractorName: m.contractorName ?? undefined,
      quoteAmount: (() => {
        const amount = m.quoteTotal ?? m.ourPrice;
        if (amount == null) return undefined;
        const n = typeof amount === 'number' ? amount : Number(amount);
        return Number.isFinite(n) ? n : undefined;
      })(),
      requiresApproval: m.status === MAINTENANCE_STATUS.QUOTING,
      ...(m.tenantResponsibilityResponse
        ? {
            tenantResponsibilityResponse: {
              agreed: m.tenantResponsibilityResponse.agreed,
              respondedAt: m.tenantResponsibilityResponse.respondedAt,
              ...(m.tenantResponsibilityResponse.reason
                ? { reason: m.tenantResponsibilityResponse.reason }
                : {}),
              ...(m.tenantResponsibilityResponse.auto ? { auto: true } : {}),
            },
          }
        : {}),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt ?? m.createdAt ?? undefined,
      deleteReason: m.closureReason ?? undefined,
      deletedAt:
        m.status === MAINTENANCE_STATUS.CANCELLED ? m.updatedAt ?? m.createdAt : undefined,
      timeline: [],
      source: 'api',
    };
  });
}

// ---------------------------------------------------------------------------
// Rent reviews
// ---------------------------------------------------------------------------

const RENT_REVIEW_TENANT_RESPONSE: Partial<
  Record<AgentRentReview['workflowState'], RentReviewCase['tenantResponse']>
> = {
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED]: 'accepted',
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED]: 'rejected',
  [RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION]: 'counter',
  [RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED]: 'pending',
};

export function mapAgentRentReviews(dtos: AgentRentReview[]): RentReviewCase[] {
  return dtos.map((r) => ({
    id: r.id,
    propertyId: r.propertyId ?? '',
    propertyAddress: r.propertyAddress,
    tenantName: r.tenantName ?? undefined,
    leaseStart: r.leaseStart ?? '',
    leaseEnd: r.leaseEnd ?? '',
    currentRent: r.currentRent ?? 0,
    suggestedRent: r.proposedRent ?? r.currentRent ?? 0,
    agreedRent: r.agreedRent ?? undefined,
    reviewDue: r.reviewDate ?? '',
    completedDate: r.completedDate ?? undefined,
    dateStarted: r.dateStarted ?? undefined,
    createdAt: r.createdAt ?? undefined,
    leaseType: r.leaseType ?? undefined,
    fixedTermWeeks: r.fixedTermWeeks ?? undefined,
    status:
      r.workflowState === 'CANCELLED'
        ? 'deleted'
        : r.workflowState === RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED
          ? 'pending negotiation'
          : r.workflowState.replace(/_/g, ' ').toLowerCase(),
    workflowState: r.workflowState,
    tenantResponse: RENT_REVIEW_TENANT_RESPONSE[r.workflowState],
    requiresApproval:
      r.workflowState === RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW ||
      r.workflowState === RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION,
    inheritedTerms: {
      waterUsage: 'Tenant pays separately',
      petsAllowed: false,
      electricityTenant: true,
      gasTenant: true,
      furnished: false,
      strataByLaws: true,
      smokeAlarmType: 'Hardwired',
      parkingSpaces: 1,
      maxOccupants: 2,
    },
    timeline: [],
  }));
}

// ---------------------------------------------------------------------------
// Vacating
// ---------------------------------------------------------------------------

export function mapAgentVacating(dtos: AgentVacating[]): VacatingCase[] {
  const stageOrder = [
    'VACATE',
    'OUTGOING_INSPECTION',
    'MAKE_GOOD',
    'SETTLEMENT',
    'AGENT_APPROVAL',
    'BOND',
    'CLOSURE',
  ];

  return dtos.map((v) => {
    const terminationStage =
      'terminationStage' in v && typeof v.terminationStage === 'string'
        ? v.terminationStage
        : undefined;
    const stageIndex = terminationStage
      ? Math.max(0, stageOrder.indexOf(terminationStage))
      : 0;
    const checklistProgress =
      v.status === VACATING_STATUS.COMPLETED
        ? 100
        : Math.round(((stageIndex + 1) / stageOrder.length) * 100);

    return {
      id: v.id,
      propertyId: v.propertyId ?? '',
      propertyAddress: v.propertyAddress,
      vacateDate: v.vacateDate ?? '',
      reason: v.responsibility ? `${v.responsibility} vacating` : 'Vacating',
      apiStatus: v.status,
      terminationStage,
      checklistProgress,
      bondStatus: v.bondOnHold ? `$${v.bondOnHold} on hold` : 'Pending',
      outgoingInspectionStatus: 'Pending',
      requiresApproval:
        v.status === VACATING_STATUS.OPEN &&
        'terminationStage' in v &&
        v.terminationStage === 'AGENT_APPROVAL',
      checklist: [],
      bondBreakdown:
        v.total != null ? [{ label: 'Bond total', amount: v.total }] : [],
      createdAt: v.createdAt ?? undefined,
      timeline: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Tenant selections (Applications)
// ---------------------------------------------------------------------------

export function mapAgentTenantSelections(
  dtos: AgentTenantSelection[],
): TenantSelectionCase[] {
  return dtos.map((a) => ({
    id: a.id,
    propertyId: a.propertyId ?? '',
    propertyAddress: a.propertyAddress,
    applicantName: a.applicantName ?? 'Applicant',
    proposedRent: a.proposedRent ?? 0,
    leaseTerm: a.leaseLength ?? '—',
    status: a.status.toLowerCase(),
    requiresApproval: a.status === APPLICATION_STATUS.SUBMITTED,
    documents: Array.from(
      { length: a.documentCount },
      (_, i) => `Document ${i + 1}`,
    ),
    createdAt: a.createdAt ?? undefined,
    timeline: [],
  }));
}

// ---------------------------------------------------------------------------
// Leasing records
// ---------------------------------------------------------------------------

function leasingStatus(status: AgentLeasing['status']): LeasingRecord['status'] {
  // SIGNED and ACTIVE are the live tenancy for agent overview / archive rules.
  if (status === LEASE_STATUS.ACTIVE || status === LEASE_STATUS.SIGNED) {
    return 'current';
  }
  if (status === LEASE_STATUS.ENDED) return 'ended';
  return 'upcoming';
}

export function mapAgentLeasing(dtos: AgentLeasing[]): LeasingRecord[] {
  return dtos.map((l) => ({
    id: l.id,
    propertyId: l.propertyId ?? '',
    leaseStart: l.leaseStart ?? '',
    leaseEnd: l.leaseEnd ?? '',
    rentWeekly: l.rentWeekly ?? 0,
    approvedTenant: l.approvedTenant ?? '—',
    bondAmount: l.bondAmount ?? undefined,
    status: leasingStatus(l.status),
  }));
}

export function mapAgentLeasingCycles(
  dtos: AgentLeasingCycle[] | undefined,
): LeasingCycle[] {
  return (dtos ?? []).map((c) => ({
    id: c.id,
    propertyId: c.propertyId,
    propertyAddress: c.propertyAddress,
    lifecycleStep: c.lifecycleStep,
    onboardingStepId: c.onboardingStepId,
    isActive: c.isActive ?? undefined,
    rentPerWeek: c.rentPerWeek ?? undefined,
    availableFrom: c.availableFrom ?? undefined,
    createdAt: c.createdAt ?? undefined,
  }));
}

export function mapAgentArchive(
  archive: AgentArchive | undefined | null,
): AgentArchiveView {
  return {
    cancelledLeasingCycles: (archive?.cancelledLeasingCycles ?? []).map(
      (c): ArchivedLeasingCycle => ({
        id: c.id,
        propertyId: c.propertyId,
        propertyAddress: c.propertyAddress,
        lifecycleStep: c.lifecycleStep,
        rentPerWeek: c.rentPerWeek ?? undefined,
        availableFrom: c.availableFrom ?? undefined,
        cancelReason: c.cancelReason,
        cancelledAt: c.cancelledAt,
      }),
    ),
    cancelledEndLeasing: (archive?.cancelledEndLeasing ?? []).map(
      (c): ArchivedEndLeasingCase => ({
        id: c.id,
        propertyId: c.propertyId ?? '',
        propertyAddress: c.propertyAddress,
        vacateDate: c.vacateDate ?? undefined,
        cancelReason: c.cancelReason,
        cancelledAt: c.cancelledAt,
      }),
    ),
    cancelledRentReviews: (archive?.cancelledRentReviews ?? []).map(
      (r): ArchivedRentReview => ({
        id: r.id,
        propertyId: r.propertyId ?? '',
        propertyAddress: r.propertyAddress,
        reviewDue: r.reviewDue ?? undefined,
        currentRent: r.currentRent ?? undefined,
        cancelReason: r.cancelReason,
        cancelledAt: r.cancelledAt,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------

export function mapAgentAccounting(
  dtos: AgentAccounting[],
): PropertyAccounting[] {
  return dtos.map((a) => {
    const row = a as AgentAccounting & {
      arrearsOpenedAt?: string | null;
      arrearsKeyDate?: string | null;
    };
    return {
      propertyId: a.propertyId,
      propertyAddress: a.propertyAddress,
      tenantName: a.tenantName ?? '—',
      rentPaidYtd: a.rentPaidYtd ?? 0,
      rentOutstanding: a.rentOutstanding ?? 0,
      currentBalance: a.arrearsAmount > 0 ? -a.arrearsAmount : 0,
      daysInArrears: a.daysInArrears,
      arrearsAmount: a.arrearsAmount,
      arrearsOpenedAt: row.arrearsOpenedAt ?? undefined,
      arrearsKeyDate: row.arrearsKeyDate ?? undefined,
      bills: [],
      statements: [],
      collectionActivity: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Tribunal
// ---------------------------------------------------------------------------

export function mapAgentTribunal(dtos: AgentTribunal[]): TribunalCase[] {
  return dtos.map((t) => {
    const closed =
      t.status === TRIBUNAL_CASE_STATUS.COMPLETED ||
      t.status === TRIBUNAL_CASE_STATUS.CLOSED;
    return {
      id: t.id,
      propertyId: t.propertyId,
      propertyAddress: t.propertyAddress,
      tenantName: t.tenantName ?? '—',
      caseNumber: t.caseNumber,
      tribunalType: t.tribunalType,
      amountClaimed: t.amountClaimed ?? undefined,
      apiStatus: t.status,
      status: closed ? 'closed' : 'active',
      matter: t.matter,
      requiresAction:
        !closed &&
        (t.status === TRIBUNAL_CASE_STATUS.DRAFT ||
          t.status === TRIBUNAL_CASE_STATUS.SUBMITTED),
      createdAt: t.createdAt ?? undefined,
      hearingDate: t.hearingDate ?? undefined,
      rentArrearsAmount: t.rentArrearsAmount ?? null,
      rentArrearsDaysOverdue: t.rentArrearsDaysOverdue ?? null,
      billArrearsAmount: t.billArrearsAmount ?? null,
      billArrearsDaysOverdue: t.billArrearsDaysOverdue ?? null,
      bondArrearsAmount: t.bondArrearsAmount ?? null,
      bondArrearsDaysOverdue: t.bondArrearsDaysOverdue ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** CommDepartment → the app's MessageCategory (both taskType and messageCategory). */
const MESSAGE_CATEGORY_BY_DEPARTMENT: Record<
  AgentMessageThread['department'],
  MessageCategory
> = {
  [COMM_DEPARTMENT.LEASING]: 'Leasing',
  [COMM_DEPARTMENT.MAINTENANCE]: 'Maintenance',
  [COMM_DEPARTMENT.INSPECTION]: 'Inspection',
  [COMM_DEPARTMENT.ACCOUNTING]: 'Accounting',
  [COMM_DEPARTMENT.TRIBUNAL]: 'Tribunal',
  [COMM_DEPARTMENT.GENERAL]: 'Others',
  // The app's `MessageCategory` is a fixed six-value union the whole message UI filters on,
  // so these two fold into the nearest existing one rather than widening it: a rent review is
  // part of the leasing lifecycle, and a complaint has no home but the catch-all. Lossy on the
  // way back through `messageCategoryToDepartment`, which is why that stays a separate switch.
  [COMM_DEPARTMENT.RENT_REVIEW]: 'Leasing',
  [COMM_DEPARTMENT.COMPLAINT]: 'Others',
};

/** The inverse: an app MessageCategory → the CommDepartment to route a new thread to. */
export function messageCategoryToDepartment(
  category: MessageCategory | undefined,
): AgentMessageThread['department'] {
  switch (category) {
    case 'Leasing':
      return COMM_DEPARTMENT.LEASING;
    case 'Maintenance':
      return COMM_DEPARTMENT.MAINTENANCE;
    case 'Inspection':
      return COMM_DEPARTMENT.INSPECTION;
    case 'Accounting':
      return COMM_DEPARTMENT.ACCOUNTING;
    case 'Tribunal':
      return COMM_DEPARTMENT.TRIBUNAL;
    default:
      return COMM_DEPARTMENT.GENERAL;
  }
}

/** A single message channel → the app's two-value channel ('app' | 'email'). */
function threadMessageChannel(
  channel: AgentThreadMessage['channel'],
): ThreadMessage['channel'] {
  return channel === COMM_CHANNEL.EMAIL ? 'email' : 'app';
}

/** The thread-level channel: 'mixed' across both, else whichever single value is used. */
function threadChannel(messages: ThreadMessage[]): MessageThread['channel'] {
  const seen = new Set(messages.map((m) => m.channel));
  if (seen.size > 1) return 'mixed';
  return seen.has('email') ? 'email' : 'app';
}

/**
 * Map the agent message-thread DTOs onto the app's richer MessageThread view-model. The
 * DTO is a thin projection, so the parties (home owner / tenant names + contacts) are
 * filled from the already-live `properties` by propertyId; `taskType`/`messageCategory`
 * derive from `department`; `relatedCaseId` from `caseId`. Per-message `mentions` stay
 * client-side (the backend reply body carries no mentions) — a documented fidelity caveat.
 */
export function mapAgentMessages(
  dtos: AgentMessageThread[],
  properties: Property[],
  agentId: AgentPortfolioId,
): MessageThread[] {
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  return dtos.map((t) => {
    const prop = t.propertyId ? propertyById.get(t.propertyId) : undefined;
    const category = MESSAGE_CATEGORY_BY_DEPARTMENT[t.department] ?? 'Others';
    const messages: ThreadMessage[] = t.messages.map((m) => ({
      id: m.id,
      at: m.at,
      from: m.from,
      // API bodies are email-shaped (plain text + an inline portal CTA button), and the thread
      // bubble renders text — without this the markup prints verbatim under the sign-off.
      body: toPlainTextBody(m.body),
      channel: threadMessageChannel(m.channel),
      sentByAgent: m.fromSelf,
      mentions: [],
    }));
    return {
      id: t.id,
      assignedAgentId: agentId,
      propertyId: t.propertyId ?? undefined,
      propertyAddress: prop
        ? formatPropertyFullAddress(prop)
        : t.propertyAddress ?? '—',
      homeOwnerName: prop?.homeOwnerName ?? '—',
      homeOwnerContact: prop?.homeOwnerContact ?? {},
      tenantName: prop?.tenantName ?? '—',
      tenantContact: prop?.tenantContact ?? {},
      subject: t.subject,
      taskType: category,
      messageCategory: category,
      relatedCaseId: t.caseId ?? undefined,
      // The DTO's own preview is raw; the fallback is already converted above. Kept as a
      // null check, not a truthiness one, so an empty preview stays empty as before.
      lastMessage:
        t.lastMessage != null
          ? toPlainTextBody(t.lastMessage)
          : (messages[messages.length - 1]?.body ?? ''),
      lastAt: t.lastAt ?? messages[messages.length - 1]?.at ?? '',
      unread: t.unread,
      channel: threadChannel(messages),
      messages,
    };
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** AgentNotificationType → the app's lower-cased notification union. */
const NOTIFICATION_TYPE_VIEW: Record<
  AgentNotificationDto['type'],
  AgentNotification['type']
> = {
  [AGENT_NOTIFICATION_TYPE.APPROVAL]: 'approval',
  [AGENT_NOTIFICATION_TYPE.URGENT]: 'urgent',
  [AGENT_NOTIFICATION_TYPE.UPDATE]: 'update',
  [AGENT_NOTIFICATION_TYPE.REPORT]: 'report',
  [AGENT_NOTIFICATION_TYPE.REMINDER]: 'reminder',
};

/**
 * Map the agent notification DTOs onto the app's `AgentNotification` view-model. The DTO
 * is thin, so view-only fields the facade doesn't carry (`taskType`, `status`,
 * `overdueHours`, `escalationNote`) land on safe empty defaults — the same shape the
 * screen already tolerates for demo data. `source: 'api'` marks the live origin.
 */
export function mapAgentNotifications(
  dtos: AgentNotificationDto[],
): AgentNotification[] {
  return dtos.map((n) => ({
    id: n.id,
    type: NOTIFICATION_TYPE_VIEW[n.type] ?? 'update',
    title: n.title,
    // Notification bodies are the same email-shaped copy as thread messages.
    body: toPlainTextBody(n.body),
    propertyAddress: n.propertyAddress ?? '',
    taskType: '',
    status: '',
    at: n.createdAt,
    read: n.read,
    href: n.href,
    actionRequired: n.actionRequired ?? undefined,
    source: 'api',
  }));
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * Map the agent document DTOs onto the app's `AgentDocument` view-model. The facade
 * normalises every doc (aggregated or uploaded) onto the app's category vocabulary, so
 * `category` is a straight passthrough; `url` (the R2/aggregated file URL) backs both the
 * in-app link and the download. A null property (portfolio-level upload) shows as 'Portfolio'.
 */
export function mapAgentDocuments(dtos: AgentDocumentDto[]): AgentDocument[] {
  return dtos.map((d) => {
    // Proxy through the API — direct R2 URLs fail browser fetch CORS in the preview dialog.
    const href = agentDocumentFileHref(d.id);
    return {
      id: d.id,
      title: d.name,
      propertyAddress: d.propertyAddress ?? 'Portfolio',
      category: d.category,
      uploadedAt: d.uploadedAt,
      href,
      downloadUrl: href,
    };
  });
}
