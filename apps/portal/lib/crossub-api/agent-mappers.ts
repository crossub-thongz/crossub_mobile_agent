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
  type AgentArchive,
} from './agent-client';
import {
  AGENT_NOTIFICATION_TYPE,
  APPLICATION_STATUS,
  COMM_CHANNEL,
  COMM_DEPARTMENT,
  INSPECTION_STATUS,
  INSPECTION_TYPE,
  LEASE_STATUS,
  MAINTENANCE_ORDER_TYPE,
  MAINTENANCE_STATUS,
  RENT_REVIEW_WORKFLOW_STATE,
  TRIBUNAL_CASE_STATUS,
  VACATING_STATUS,
} from '@/constants/api-enums';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';
import { formatPropertyFullAddress } from '@/lib/utils';
import type {
  AgentArchiveView,
  ArchivedEndLeasingCase,
  ArchivedLeasingCycle,
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
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';

type AgentPortfolioId = 'agent-1' | 'agent-2';

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
    address: dto.address,
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
    landlordInsuranceExpiry: ext.landlordInsuranceExpiry ?? undefined,
    administrationFee: ext.administrationFee ?? undefined,
    documentationFee: ext.documentationFee ?? undefined,
    lettingFee: ext.lettingFee ?? undefined,
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
    openTasks: 0,
    inspectionStatus: '—',
    maintenanceStatus: '—',
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
    propertyCount: 0,
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

function inspectionReportStatus(
  dto: AgentInspection,
): Inspection['reportStatus'] {
  if (dto.status === INSPECTION_STATUS.PUBLISHED) return 'sent';
  if (dto.status === INSPECTION_STATUS.COMPLETED) return 'approved';
  return dto.reportUrl ? 'uploaded' : 'pending';
}

export function mapAgentInspections(dtos: AgentInspection[]): Inspection[] {
  return dtos.map((i) => {
    const type = INSPECTION_TYPE_VIEW[i.type] ?? 'ROUTINE';
    return {
      id: i.id,
      trackingNumber: inspectionReferenceLabel(i.id, type),
      type,
    propertyId: i.propertyId ?? '',
    propertyAddress: i.propertyAddress,
    inspector: i.inspectorName ?? undefined,
    scheduledAt: i.scheduledDate ?? i.inspectionDate ?? undefined,
    status: INSPECTION_STATUS_LABEL[i.status] ?? i.status,
    apiStatus: i.status,
    reportStatus: inspectionReportStatus(i),
    reportUrl: i.reportUrl ?? undefined,
    timeline: [],
  };
  });
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

const MAINTENANCE_STATUS_LABEL: Record<AgentMaintenance['status'], string> = {
  [MAINTENANCE_STATUS.OPEN]: 'Open',
  [MAINTENANCE_STATUS.APPROVED]: 'Approved',
  [MAINTENANCE_STATUS.QUOTING]: 'Quote approval',
  [MAINTENANCE_STATUS.SCHEDULED]: 'In progress',
  [MAINTENANCE_STATUS.INVOICED]: 'Invoiced',
  [MAINTENANCE_STATUS.COMPLETED]: 'Completed',
  [MAINTENANCE_STATUS.CANCELLED]: 'Cancelled',
};

const RESPONSIBILITY_VIEW: Record<
  AgentMaintenance['type'],
  MaintenanceRequest['responsibility']
> = {
  [MAINTENANCE_ORDER_TYPE.TENANT_REQUEST]: 'tenant',
  [MAINTENANCE_ORDER_TYPE.PROPERTY_MAINTENANCE]: 'landlord',
  [MAINTENANCE_ORDER_TYPE.STRATA]: 'strata',
  [MAINTENANCE_ORDER_TYPE.UNKNOWN]: 'pending',
};

export function mapAgentMaintenance(
  dtos: AgentMaintenance[],
): MaintenanceRequest[] {
  return dtos.map((m) => {
    const priority: Priority = m.urgent ? 'urgent' : 'normal';
    return {
      id: m.id,
      trackingNumber: m.orderNumber ?? workflowCaseReferenceLabel(m.id, 'maintenance'),
      propertyId: m.propertyId ?? '',
      propertyAddress: m.propertyAddress,
      title: m.categoryName ?? m.description ?? 'Maintenance request',
      description: m.description ?? '',
      status: MAINTENANCE_STATUS_LABEL[m.status] ?? m.status,
      apiStatus: m.status,
      priority,
      responsibility: RESPONSIBILITY_VIEW[m.type] ?? 'pending',
      contractorName: m.contractorName ?? undefined,
      quoteAmount: m.quoteTotal ?? m.ourPrice ?? undefined,
      requiresApproval: m.status === MAINTENANCE_STATUS.QUOTING,
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
    status: r.workflowState.replace(/_/g, ' ').toLowerCase(),
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
    timeline: [],
  }));
}

// ---------------------------------------------------------------------------
// Leasing records
// ---------------------------------------------------------------------------

function leasingStatus(status: AgentLeasing['status']): LeasingRecord['status'] {
  if (status === LEASE_STATUS.ACTIVE) return 'current';
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
    rentPerWeek: c.rentPerWeek ?? undefined,
    availableFrom: c.availableFrom ?? undefined,
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
  };
}

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------

export function mapAgentAccounting(
  dtos: AgentAccounting[],
): PropertyAccounting[] {
  return dtos.map((a) => ({
    propertyId: a.propertyId,
    propertyAddress: a.propertyAddress,
    tenantName: a.tenantName ?? '—',
    rentPaidYtd: a.rentPaidYtd,
    rentOutstanding: a.rentOutstanding,
    currentBalance: a.arrearsAmount > 0 ? -a.arrearsAmount : 0,
    daysInArrears: a.daysInArrears,
    arrearsAmount: a.arrearsAmount,
    bills: [],
    statements: [],
    collectionActivity: [],
  }));
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
      body: m.body,
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
      lastMessage: t.lastMessage ?? messages[messages.length - 1]?.body ?? '',
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
    body: n.body,
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
  return dtos.map((d) => ({
    id: d.id,
    title: d.name,
    propertyAddress: d.propertyAddress ?? 'Portfolio',
    category: d.category,
    uploadedAt: d.uploadedAt,
    href: d.url,
    downloadUrl: d.url,
  }));
}
