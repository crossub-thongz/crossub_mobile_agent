import type {
  AgentDocument,
  AgentNotification,
  DashboardItem,
  Inspection,
  MaintenanceRequest,
  MessageThread,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from './types';

export const PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    address: '12 Ocean View Pde',
    suburb: 'Miami',
    homeOwnerName: 'Mr & Mrs Thompson',
    homeOwnerContact: { email: 'thompson@email.com', phone: '+61 412 000 111' },
    assignedAgentId: 'agent-1',
    tenantName: 'Sarah Chen',
    tenantContact: { email: 'sarah.chen@email.com', phone: '+61 423 111 222' },
    leaseStatus: 'active',
    rentWeekly: 720,
    nextRentReview: '2026-08-15',
    openTasks: 2,
    inspectionStatus: 'Routine due Jul',
    maintenanceStatus: 'Quote pending approval',
  },
  {
    id: 'prop-2',
    address: '4/88 Surf Rd',
    suburb: 'Broadbeach',
    homeOwnerName: 'Mr & Mrs Thompson',
    homeOwnerContact: { email: 'thompson@email.com', phone: '+61 412 000 111' },
    assignedAgentId: 'agent-1',
    tenantName: 'James & Emma Walsh',
    tenantContact: { email: 'walsh.je@email.com', phone: '+61 401 333 444' },
    leaseStatus: 'vacating',
    rentWeekly: 650,
    openTasks: 3,
    inspectionStatus: 'Outgoing booked',
    maintenanceStatus: 'In progress',
  },
  {
    id: 'prop-3',
    address: '7 Palm Court',
    suburb: 'Burleigh Heads',
    homeOwnerName: 'Rivera Family Trust',
    homeOwnerContact: { email: 'rivera.trust@email.com', phone: '+61 400 555 666' },
    assignedAgentId: 'agent-2',
    tenantName: 'Vacant',
    tenantContact: {},
    leaseStatus: 'vacant',
    rentWeekly: 0,
    openTasks: 1,
    inspectionStatus: 'Open Sat 10am',
    maintenanceStatus: 'None',
  },
  {
    id: 'prop-4',
    address: '22 Hinterland Dr',
    suburb: 'Robina',
    homeOwnerName: 'Rivera Family Trust',
    homeOwnerContact: { email: 'rivera.trust@email.com', phone: '+61 400 555 666' },
    assignedAgentId: 'agent-2',
    tenantName: 'Priya Nair',
    tenantContact: { email: 'priya.nair@email.com', phone: '+61 422 777 888' },
    leaseStatus: 'periodic',
    rentWeekly: 580,
    nextRentReview: '2026-06-01',
    openTasks: 1,
    inspectionStatus: 'Ingoing complete',
    maintenanceStatus: 'Closed',
  },
];

export const MAINTENANCE: MaintenanceRequest[] = [
  {
    id: 'mnt-1',
    trackingNumber: 'MNT-2026-0142',
    propertyId: 'prop-1',
    propertyAddress: '12 Ocean View Pde, Miami',
    title: 'Hot water system leak',
    description:
      'Tenant reported pooling water under HWS. CROSSUB reviewed photos and assigned plumber.',
    status: 'Quote Approval',
    priority: 'urgent',
    responsibility: 'landlord',
    contractorName: 'Gold Coast Plumbing Co.',
    quoteAmount: 1840,
    quoteExpiry: '2026-05-28',
    recommendation: 'Recommend approval — only licensed option available this week.',
    contractorStatus: 'pending',
    quoteDocumentUrl: '#quote-mnt-1',
    requiresApproval: true,
    timeline: [
      {
        id: 't0',
        at: '2026-05-24T14:30:00',
        actor: 'CROSSUB Ops (Sarah)',
        actorRole: 'crossub',
        title: 'Quote approval submitted on behalf of agent',
        detail: 'Staff assisted — agent requested phone approval',
        source: 'app',
        staffAssisted: true,
      },
      {
        id: 't1',
        at: '2026-05-24T09:15:00',
        actor: 'Sarah Chen',
        actorRole: 'tenant',
        title: 'Issue reported via tenant app',
        source: 'app',
      },
      {
        id: 't2',
        at: '2026-05-24T11:30:00',
        actor: 'CROSSUB Ops',
        actorRole: 'crossub',
        title: 'Responsibility determined: Landlord',
        detail: 'Plumbing failure — normal wear excluded from tenant responsibility.',
        source: 'system',
      },
      {
        id: 't3',
        at: '2026-05-25T08:00:00',
        actor: 'Gold Coast Plumbing Co.',
        actorRole: 'contractor',
        title: 'Quote uploaded — $1,840 inc GST',
        source: 'app',
      },
    ],
  },
  {
    id: 'mnt-2',
    trackingNumber: 'MNT-2026-0138',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    title: 'Carpet steam clean — exit',
    description: 'Part of vacating checklist. Tenant arranged own cleaner.',
    status: 'In Progress',
    priority: 'normal',
    responsibility: 'tenant',
    requiresApproval: false,
    timeline: [
      {
        id: 't1',
        at: '2026-05-20T14:00:00',
        actor: 'CROSSUB Ops',
        actorRole: 'crossub',
        title: 'Tenant notified of cleaning requirement',
        source: 'email',
      },
    ],
  },
];

export const INSPECTIONS: Inspection[] = [
  {
    id: 'insp-1',
    trackingNumber: 'INS-2026-0088',
    type: 'OUTGOING',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    inspector: 'Marcus Reid',
    scheduledAt: '2026-05-27T10:00:00',
    status: 'Scheduled',
    reportStatus: 'pending',
    keyStatus: 'Agent holds — collect 9:30am',
    areaOutcomes: [
      { area: 'Living room', outcome: 'Fair wear', note: 'Minor scuff marks' },
      { area: 'Kitchen', outcome: 'Action required', note: 'Bench chip noted' },
      { area: 'Bathroom', outcome: 'Good' },
    ],
    maintenanceEscalations: [
      { label: 'Kitchen bench repair', severity: 'high' },
      { label: 'Carpet steam clean', severity: 'normal' },
    ],
    imageComparisons: [
      {
        area: 'Living room',
        ingoingLabel: 'Ingoing — good condition',
        outgoingLabel: 'Outgoing — scuff marks noted',
        issueNote: 'Fair wear vs tenant damage under review',
      },
      {
        area: 'Kitchen bench',
        ingoingLabel: 'Ingoing — no chips',
        outgoingLabel: 'Outgoing — chip on corner',
        issueNote: 'Escalated to maintenance',
      },
    ],
    timeline: [
      {
        id: 't1',
        at: '2026-05-22T16:00:00',
        actor: 'CROSSUB Scheduling',
        actorRole: 'crossub',
        title: 'Outgoing inspection booked',
        source: 'system',
      },
    ],
  },
  {
    id: 'insp-2',
    trackingNumber: 'INS-2026-0071',
    type: 'ROUTINE',
    propertyId: 'prop-1',
    propertyAddress: '12 Ocean View Pde, Miami',
    inspector: 'Pending assignment',
    scheduledAt: '2026-06-05T09:00:00',
    status: 'Scheduled',
    reportStatus: 'pending',
    routineMode: 'in_person',
    nextDueDate: '2026-09-05',
    timeline: [
      {
        id: 't1',
        at: '2026-05-18T10:00:00',
        actor: 'System',
        actorRole: 'system',
        title: 'Next routine due calculated from last sign-off',
        source: 'system',
      },
    ],
  },
  {
    id: 'insp-3',
    trackingNumber: 'INS-2026-0095',
    type: 'OPEN',
    propertyId: 'prop-3',
    propertyAddress: '7 Palm Court, Burleigh Heads',
    inspector: 'Lisa Tran',
    scheduledAt: '2026-05-31T10:00:00',
    status: 'Confirmed',
    reportStatus: 'pending',
    keyStatus: 'Office lockbox',
    visitorCount: 12,
    timeline: [
      {
        id: 't1',
        at: '2026-05-23T12:00:00',
        actor: 'CROSSUB Leasing',
        actorRole: 'crossub',
        title: 'Open inspection times confirmed — push sent',
        source: 'system',
      },
    ],
  },
  {
    id: 'insp-4',
    trackingNumber: 'INS-2026-0060',
    type: 'INGOING',
    propertyId: 'prop-4',
    propertyAddress: '22 Hinterland Dr, Robina',
    inspector: 'Marcus Reid',
    scheduledAt: '2026-04-10T11:00:00',
    status: 'Completed',
    reportStatus: 'sent',
    reportUrl: '#report-insp-4',
    tenantAck: 'confirmed',
    keyStatus: 'Tenant holds',
    timeline: [
      {
        id: 't1',
        at: '2026-04-12T15:00:00',
        actor: 'Priya Nair',
        actorRole: 'tenant',
        title: 'Tenant acknowledged ingoing report',
        source: 'app',
      },
    ],
  },
];

export const RENT_REVIEWS: RentReviewCase[] = [
  {
    id: 'rr-1',
    propertyId: 'prop-4',
    propertyAddress: '22 Hinterland Dr, Robina',
    leaseStart: '2025-06-01',
    leaseEnd: '2026-05-31',
    currentRent: 580,
    suggestedRent: 620,
    reviewDue: '2026-06-01',
    status: 'Agent Confirmation',
    requiresApproval: true,
    tenantResponse: 'counter',
    counterOffer: 600,
    negotiationHistory: [
      { at: '2026-05-22T09:30:00', party: 'CROSSUB AI', amount: 620, note: 'Market report suggested' },
      { at: '2026-05-24T14:00:00', party: 'Agent', amount: 620, note: 'Proposed to tenant' },
      { at: '2026-05-25T11:00:00', party: 'Tenant', amount: 600, note: 'Counter offer submitted' },
    ],
    timeline: [
      {
        id: 't1',
        at: '2026-05-20T08:00:00',
        actor: 'System',
        actorRole: 'system',
        title: 'Rent review task auto-created (90 days prior)',
        source: 'system',
      },
      {
        id: 't2',
        at: '2026-05-22T09:30:00',
        actor: 'CROSSUB AI',
        actorRole: 'crossub',
        title: 'Comparable market report generated — $620/week suggested',
        source: 'system',
      },
    ],
  },
];

export const VACATING: VacatingCase[] = [
  {
    id: 'vac-1',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    vacateDate: '2026-06-07',
    reason: 'Tenant initiated',
    checklistProgress: 45,
    bondStatus: 'Pending inspection',
    outgoingInspectionStatus: 'Booked 27 May',
    requiresApproval: true,
    checklist: [
      { label: 'Notice confirmed', status: 'done' },
      { label: 'Outgoing inspection', status: 'pending' },
      { label: 'Exit cleaning', status: 'pending' },
      { label: 'Keys returned', status: 'pending' },
      { label: 'Utilities & maintenance', status: 'pending' },
      { label: 'Bond claim', status: 'pending' },
    ],
    bondBreakdown: [
      { label: 'Bond held', amount: 2600 },
      { label: 'Rent arrears', amount: 0 },
      { label: 'Cleaning (est.)', amount: 350 },
      { label: 'Repairs (TBC)', amount: 0 },
    ],
    timeline: [
      {
        id: 't1',
        at: '2026-05-15T10:00:00',
        actor: 'James Walsh',
        actorRole: 'tenant',
        title: 'Vacating notice received',
        detail: 'Effective vacate 7 Jun 2026',
        source: 'app',
      },
    ],
  },
];

export const TENANT_SELECTIONS: TenantSelectionCase[] = [
  {
    id: 'ts-1',
    propertyId: 'prop-3',
    propertyAddress: '7 Palm Court, Burleigh Heads',
    applicantName: 'Alex Rivera',
    proposedRent: 680,
    leaseTerm: '12 months',
    status: 'Awaiting agent approval',
    requiresApproval: true,
    documents: ['Application form.pdf', 'ID verification.pdf', 'References.pdf'],
    timeline: [
      {
        id: 't1',
        at: '2026-05-24T10:00:00',
        actor: 'CROSSUB Leasing',
        actorRole: 'crossub',
        title: 'Application shortlisted after open inspection',
        source: 'system',
      },
    ],
  },
];

export const DOCUMENTS: AgentDocument[] = [
  {
    id: 'doc-1',
    title: 'Ingoing inspection report',
    propertyAddress: '22 Hinterland Dr, Robina',
    category: 'inspection',
    uploadedAt: '2026-04-12T15:00:00',
    href: '/inspections/insp-4',
    downloadUrl: '#report-insp-4',
  },
  {
    id: 'doc-2',
    title: 'Rent review market PDF',
    propertyAddress: '22 Hinterland Dr, Robina',
    category: 'rent_review',
    uploadedAt: '2026-05-22T09:30:00',
    href: '/rent-review/rr-1',
    downloadUrl: '#rent-review-rr-1',
  },
  {
    id: 'doc-3',
    title: 'Maintenance invoice WO-44921',
    propertyAddress: '452 Industrial Way, Tower A',
    category: 'maintenance',
    uploadedAt: '2026-05-20T12:00:00',
    href: '/maintenance/WO-44921',
  },
  {
    id: 'doc-4',
    title: 'Lease agreement',
    propertyAddress: '12 Ocean View Pde, Miami',
    category: 'lease',
    uploadedAt: '2025-08-01T09:00:00',
    href: '/properties/prop-1',
  },
];

export const MESSAGE_THREADS: MessageThread[] = [
  {
    id: 'msg-1',
    assignedAgentId: 'agent-1',
    propertyId: 'prop-1',
    propertyAddress: '12 Ocean View Pde, Miami',
    homeOwnerName: 'Mr & Mrs Thompson',
    homeOwnerContact: { email: 'thompson@email.com', phone: '+61 412 000 111' },
    tenantName: 'Sarah Chen',
    tenantContact: { email: 'sarah.chen@email.com', phone: '+61 423 111 222' },
    subject: 'Hot water quote approval',
    taskType: 'Maintenance',
    lastMessage: 'Quote attached — please approve by Wed.',
    lastAt: '2026-05-25T08:05:00',
    unread: 1,
    channel: 'mixed',
    messages: [
      {
        id: 'm1',
        at: '2026-05-25T08:00:00',
        from: 'CROSSUB Ops',
        body: 'Plumber quote uploaded for your review.',
        channel: 'app',
      },
      {
        id: 'm2',
        at: '2026-05-25T08:05:00',
        from: 'CROSSUB Ops',
        body: 'Quote attached — please approve by Wed.',
        channel: 'email',
      },
    ],
  },
  {
    id: 'msg-2',
    assignedAgentId: 'agent-1',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    homeOwnerName: 'Mr & Mrs Thompson',
    homeOwnerContact: { email: 'thompson@email.com', phone: '+61 412 000 111' },
    tenantName: 'James & Emma Walsh',
    tenantContact: { email: 'walsh.je@email.com', phone: '+61 401 333 444' },
    subject: 'Outgoing inspection schedule',
    taskType: 'Inspection',
    lastMessage: 'Inspection confirmed for Tue 27 May 10:00am.',
    lastAt: '2026-05-22T16:10:00',
    unread: 0,
    channel: 'app',
    messages: [
      {
        id: 'm1',
        at: '2026-05-22T16:10:00',
        from: 'CROSSUB Scheduling',
        body: 'Inspection confirmed for Tue 27 May 10:00am.',
        channel: 'app',
      },
    ],
  },
];

export const NOTIFICATIONS: AgentNotification[] = [
  {
    id: 'n1',
    type: 'approval',
    title: 'Maintenance quote needs approval',
    body: 'Gold Coast Plumbing — $1,840 for HWS repair',
    propertyAddress: '12 Ocean View Pde, Miami',
    taskType: 'Maintenance',
    status: 'Quote Approval',
    at: '2026-05-25T08:00:00',
    read: false,
    href: '/maintenance/mnt-1',
    actionRequired: 'Approve / Decline / Requote',
  },
  {
    id: 'n2',
    type: 'reminder',
    title: 'Rent review confirmation due',
    body: 'Confirm review for 22 Hinterland Dr',
    propertyAddress: '22 Hinterland Dr, Robina',
    taskType: 'Rent Review',
    status: 'Agent Confirmation',
    at: '2026-05-24T09:00:00',
    read: false,
    href: '/rent-review/rr-1',
    actionRequired: 'Confirm or adjust rent',
  },
  {
    id: 'n3',
    type: 'urgent',
    title: 'Overdue approval — escalated',
    body: 'HWS quote expires in 2 days',
    propertyAddress: '12 Ocean View Pde, Miami',
    taskType: 'Maintenance',
    status: 'Overdue',
    at: '2026-05-25T07:00:00',
    read: true,
    href: '/maintenance/mnt-1',
  },
  {
    id: 'n4',
    type: 'update',
    title: 'Open inspection times confirmed',
    body: 'Sat 31 May 10:00am — 7 Palm Court',
    propertyAddress: '7 Palm Court, Burleigh Heads',
    taskType: 'Inspection',
    status: 'Confirmed',
    at: '2026-05-23T12:00:00',
    read: true,
    href: '/inspections/insp-3',
  },
];

export const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    id: 'd1',
    module: 'maintenance',
    propertyId: 'prop-1',
    propertyAddress: '12 Ocean View Pde, Miami',
    title: 'Approve plumbing quote',
    subtitle: 'Gold Coast Plumbing — $1,840',
    priority: 'urgent',
    status: 'Quote Approval',
    dueAt: '2026-05-28',
    overdueHours: 0,
    requiresApproval: true,
    href: '/maintenance/mnt-1',
    updatedAt: '2026-05-25T08:00:00',
  },
  {
    id: 'd2',
    module: 'rent_review',
    propertyId: 'prop-4',
    propertyAddress: '22 Hinterland Dr, Robina',
    title: 'Confirm rent review',
    subtitle: 'AI suggests $620/week (currently $580)',
    priority: 'high',
    status: 'Agent Confirmation',
    dueAt: '2026-06-01',
    requiresApproval: true,
    href: '/rent-review/rr-1',
    updatedAt: '2026-05-22T09:30:00',
  },
  {
    id: 'd3',
    module: 'inspection',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    title: 'Outgoing inspection Tue 10am',
    subtitle: 'Inspector: Marcus Reid',
    priority: 'normal',
    status: 'Scheduled',
    dueAt: '2026-05-27T10:00:00',
    requiresApproval: false,
    href: '/inspections/insp-1',
    updatedAt: '2026-05-22T16:00:00',
  },
  {
    id: 'd4',
    module: 'vacating',
    propertyId: 'prop-2',
    propertyAddress: '4/88 Surf Rd, Broadbeach',
    title: 'Vacating checklist 45% complete',
    subtitle: 'Vacate date 7 Jun — outgoing inspection pending',
    priority: 'normal',
    status: 'In Progress',
    dueAt: '2026-06-07',
    requiresApproval: false,
    href: '/vacating/vac-1',
    updatedAt: '2026-05-15T10:00:00',
  },
];

export function getProperty(id: string): Property | undefined {
  return PROPERTIES.find((p) => p.id === id);
}

export function getMaintenance(id: string): MaintenanceRequest | undefined {
  return MAINTENANCE.find((m) => m.id === id);
}

export function getInspection(id: string): Inspection | undefined {
  return INSPECTIONS.find((i) => i.id === id);
}

export function getRentReview(id: string): RentReviewCase | undefined {
  return RENT_REVIEWS.find((r) => r.id === id);
}

export function getVacating(id: string): VacatingCase | undefined {
  return VACATING.find((v) => v.id === id);
}

export function getMessageThread(id: string): MessageThread | undefined {
  return MESSAGE_THREADS.find((m) => m.id === id);
}

export function getTenantSelection(id: string): TenantSelectionCase | undefined {
  return TENANT_SELECTIONS.find((t) => t.id === id);
}

export function getPropertyTasks(propertyId: string) {
  return {
    maintenance: MAINTENANCE.filter((m) => m.propertyId === propertyId),
    inspections: INSPECTIONS.filter((i) => i.propertyId === propertyId),
    rentReviews: RENT_REVIEWS.filter((r) => r.propertyId === propertyId),
    vacating: VACATING.filter((v) => v.propertyId === propertyId),
  };
}
