import type { ApiMaintenanceAuditLogEntry, ApiMaintenanceResponsibility } from '@/lib/crossub-api/types';
import type { MaintenanceRequest } from '@/lib/types';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';

export type MaintenanceResponsibilityContext = {
  workspaceCase: Pick<
    MaintenanceWorkspaceCase,
    | 'responsibility'
    | 'auditEntries'
    | 'status'
    | 'invitedContractorIds'
    | 'invitedContractors'
    | 'assignedContractorId'
    | 'quotations'
    | 'quotationIds'
    | 'notifications'
  >;
  item: Pick<
    MaintenanceRequest,
    'responsibility' | 'requiresApproval' | 'invitedContractorIds' | 'contractorName'
  >;
};

const ADVANCED_STATUSES = new Set([
  'pending_quotation',
  'pending_approval',
  'in_progress',
  'completed',
  'closed',
]);

function parseResponsibilityToken(text: string): ApiMaintenanceResponsibility | undefined {
  const lower = text.toLowerCase();
  // Prefer explicit phrases — email bodies can mention other parties incidentally.
  const explicit =
    lower.match(
      /(?:responsibility\s+(?:set\s+to|determined\s*[·.•-]\s*|classified\s+as)\s+)(tenant|landlord|strata)/i,
    ) ?? lower.match(/\b(tenant|landlord|strata)\s+responsibility\b/i);
  if (explicit?.[1]) {
    return explicit[1].toLowerCase() as ApiMaintenanceResponsibility;
  }
  if (lower.includes('landlord')) return 'landlord';
  if (lower.includes('strata')) return 'strata';
  if (lower.includes('tenant')) return 'tenant';
  return undefined;
}

/** Recover responsibility from audit when the in-memory field was lost on hydrate. */
export function inferResponsibilityFromAudit(
  entries: ApiMaintenanceAuditLogEntry[],
): ApiMaintenanceResponsibility | undefined {
  const hit = [...entries]
    .reverse()
    .find((entry) => entry.action === 'responsibility_set');
  if (!hit) return undefined;
  return parseResponsibilityToken(hit.message);
}

/** Recover from responsibility notification emails logged on the case. */
export function inferResponsibilityFromNotifications(
  notifications: Array<{ title: string }>,
): ApiMaintenanceResponsibility | undefined {
  const hit = [...notifications]
    .reverse()
    .find((n) => /responsibility determined/i.test(n.title));
  if (!hit) return undefined;
  return parseResponsibilityToken(hit.title);
}

/** Landlord jobs advance through contractor RFQ / quote stages — infer when explicit field is missing. */
export function inferLandlordResponsibilityFromWorkflow(input: {
  status?: string;
  assignedContractorId?: string;
  invitedContractorIds?: string[];
  quotationIds?: string[];
  quotationsCount?: number;
  contractorName?: string;
  requiresApproval?: boolean;
}): 'landlord' | undefined {
  if (!input.status || !ADVANCED_STATUSES.has(input.status)) return undefined;

  // requiresApproval / completed gates alone are not landlord signals — tenant jobs
  // also reach completed/closed with sign-off style flags.
  const hasLandlordSignals =
    Boolean(input.assignedContractorId) ||
    Boolean(input.contractorName) ||
    (input.invitedContractorIds?.length ?? 0) > 0 ||
    (input.quotationIds?.length ?? 0) > 0 ||
    (input.quotationsCount ?? 0) > 0;

  return hasLandlordSignals ? 'landlord' : undefined;
}

export function resolveResponsibilityFromSources(sources: {
  explicit?: ApiMaintenanceResponsibility | 'pending' | null;
  auditEntries?: ApiMaintenanceAuditLogEntry[];
  notifications?: Array<{ title: string }>;
  status?: string;
  assignedContractorId?: string;
  invitedContractorIds?: string[];
  quotationIds?: string[];
  quotationsCount?: number;
  contractorName?: string;
  requiresApproval?: boolean;
}): ApiMaintenanceResponsibility | undefined {
  // Durable audit/notifications first — a stale explicit "landlord" inference from
  // an earlier hydrate must not win over "Responsibility set to tenant".
  const fromAudit = inferResponsibilityFromAudit(sources.auditEntries ?? []);
  if (fromAudit) return fromAudit;

  const fromNotifications = inferResponsibilityFromNotifications(sources.notifications ?? []);
  if (fromNotifications) return fromNotifications;

  if (sources.explicit && sources.explicit !== 'pending') {
    return sources.explicit;
  }

  return inferLandlordResponsibilityFromWorkflow({
    status: sources.status,
    assignedContractorId: sources.assignedContractorId,
    invitedContractorIds: sources.invitedContractorIds,
    quotationIds: sources.quotationIds,
    quotationsCount: sources.quotationsCount,
    contractorName: sources.contractorName,
    requiresApproval: sources.requiresApproval,
  });
}

export function resolveMaintenanceResponsibility(
  ctx: MaintenanceResponsibilityContext,
): ApiMaintenanceResponsibility | undefined {
  return resolveResponsibilityFromSources({
    explicit:
      ctx.workspaceCase.responsibility ??
      (ctx.item.responsibility !== 'pending' ? ctx.item.responsibility : undefined),
    auditEntries: ctx.workspaceCase.auditEntries,
    notifications: ctx.workspaceCase.notifications,
    status: ctx.workspaceCase.status,
    assignedContractorId: ctx.workspaceCase.assignedContractorId,
    invitedContractorIds:
      ctx.workspaceCase.invitedContractorIds ?? ctx.item.invitedContractorIds,
    quotationIds: ctx.workspaceCase.quotationIds,
    quotationsCount: ctx.workspaceCase.quotations.length,
    contractorName: ctx.item.contractorName,
    requiresApproval: ctx.item.requiresApproval,
  });
}

export function inferInvitedContractorIdsFromAudit(
  entries: ApiMaintenanceAuditLogEntry[],
): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (entry.action !== 'contractor_assigned') continue;
    const namedMatch = entry.message.match(/RFQ sent to .+? \(([^)]+)\) for quote review/i);
    const legacyMatch = entry.message.match(/contractor\s+(\S+)\s+for quote review/i);
    const contractorId = namedMatch?.[1] ?? legacyMatch?.[1];
    if (!contractorId) continue;
    if (!ids.some((existing) => existing === contractorId)) ids.push(contractorId);
  }
  return ids;
}

export function resolveInvitedContractorIds(
  ctx: MaintenanceResponsibilityContext,
): string[] {
  const fromSnapshot = ctx.workspaceCase.invitedContractors?.map((row) => row.id) ?? [];
  if (fromSnapshot.length > 0) return fromSnapshot;

  const fromCase = ctx.workspaceCase.invitedContractorIds ?? [];
  if (fromCase.length > 0) return fromCase;

  const fromItem = ctx.item.invitedContractorIds ?? [];
  if (fromItem.length > 0) return fromItem;

  return inferInvitedContractorIdsFromAudit(ctx.workspaceCase.auditEntries);
}

export function isLandlordMaintenanceFlow(ctx: MaintenanceResponsibilityContext): boolean {
  const responsibility = resolveMaintenanceResponsibility(ctx);
  if (responsibility === 'landlord') return true;
  if (responsibility === 'tenant' || responsibility === 'strata') return false;

  const { status, assignedContractorId, quotations } = ctx.workspaceCase;
  const invitedContractorIds = resolveInvitedContractorIds(ctx);
  if (status === 'pending_quotation' || status === 'pending_approval') {
    return Boolean(
      invitedContractorIds.length > 0 ||
        assignedContractorId ||
        quotations.length > 0 ||
        ctx.item.contractorName,
    );
  }

  return ctx.item.requiresApproval === true;
}
