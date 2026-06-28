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
  AgentInspection,
  AgentLeasing,
  AgentMaintenance,
  AgentMessageThread,
  AgentProperty,
  AgentRentReview,
  AgentTenantSelection,
  AgentThreadMessage,
  AgentTribunal,
  AgentVacating,
} from './agent-client';
import {
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
import type {
  Inspection,
  LeasingRecord,
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

type AgentPortfolioId = 'agent-1' | 'agent-2';

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

/** Map one enriched property card onto the app's rich Property view-model. */
export function mapAgentProperty(
  dto: AgentProperty,
  agentId: AgentPortfolioId,
): Property {
  return {
    id: dto.id,
    address: dto.address,
    suburb: dto.suburb ?? '',
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
    carSpaces: dto.parking ?? undefined,
    leaseStart: dto.leaseStart ?? undefined,
    leaseEnd: dto.leaseEnd ?? undefined,
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
  return dtos.map((i) => ({
    id: i.id,
    trackingNumber: i.id.slice(0, 8).toUpperCase(),
    type: INSPECTION_TYPE_VIEW[i.type] ?? 'ROUTINE',
    propertyId: i.propertyId ?? '',
    propertyAddress: i.propertyAddress,
    inspector: i.inspectorName ?? undefined,
    scheduledAt: i.scheduledDate ?? i.inspectionDate ?? undefined,
    status: INSPECTION_STATUS_LABEL[i.status] ?? i.status,
    reportStatus: inspectionReportStatus(i),
    reportUrl: i.reportUrl ?? undefined,
    timeline: [],
  }));
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
      trackingNumber: m.orderNumber ?? m.id.slice(0, 8).toUpperCase(),
      propertyId: m.propertyId ?? '',
      propertyAddress: m.propertyAddress,
      title: m.categoryName ?? m.description ?? 'Maintenance request',
      description: m.description ?? '',
      status: MAINTENANCE_STATUS_LABEL[m.status] ?? m.status,
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
    leaseStart: '',
    leaseEnd: '',
    currentRent: r.currentRent ?? 0,
    suggestedRent: r.proposedRent ?? r.currentRent ?? 0,
    reviewDue: r.reviewDate ?? '',
    status: r.workflowState.replace(/_/g, ' ').toLowerCase(),
    tenantResponse: RENT_REVIEW_TENANT_RESPONSE[r.workflowState],
    requiresApproval:
      r.workflowState === RENT_REVIEW_WORKFLOW_STATE.AGENT_REVIEW ||
      r.workflowState === RENT_REVIEW_WORKFLOW_STATE.PENDING_CONFIRMATION,
    timeline: [],
  }));
}

// ---------------------------------------------------------------------------
// Vacating
// ---------------------------------------------------------------------------

export function mapAgentVacating(dtos: AgentVacating[]): VacatingCase[] {
  return dtos.map((v) => ({
    id: v.id,
    propertyId: v.propertyId ?? '',
    propertyAddress: v.propertyAddress,
    vacateDate: v.vacateDate ?? '',
    reason: v.responsibility ? `${v.responsibility} vacating` : 'Vacating',
    checklistProgress: v.status === VACATING_STATUS.COMPLETED ? 100 : 25,
    bondStatus: v.bondOnHold ? `$${v.bondOnHold} on hold` : 'Pending',
    outgoingInspectionStatus: 'Pending',
    requiresApproval: v.status === VACATING_STATUS.OPEN,
    checklist: [],
    bondBreakdown:
      v.total != null ? [{ label: 'Bond total', amount: v.total }] : [],
    timeline: [],
  }));
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
      status: closed ? 'closed' : 'active',
      matter: t.matter,
      requiresAction: !closed,
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
        ? `${prop.address}, ${prop.suburb}`
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
