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
  >;
  item: Pick<
    MaintenanceRequest,
    'responsibility' | 'requiresApproval' | 'invitedContractorIds' | 'contractorName'
  >;
};

/** Recover responsibility from audit when the in-memory field was lost on hydrate. */
export function inferResponsibilityFromAudit(
  entries: ApiMaintenanceAuditLogEntry[],
): ApiMaintenanceResponsibility | undefined {
  const hit = [...entries]
    .reverse()
    .find((entry) => entry.action === 'responsibility_set');
  if (!hit) return undefined;

  const message = hit.message.toLowerCase();
  if (message.includes('landlord')) return 'landlord';
  if (message.includes('strata')) return 'strata';
  if (message.includes('tenant')) return 'tenant';
  return undefined;
}

export function resolveMaintenanceResponsibility(
  ctx: MaintenanceResponsibilityContext,
): ApiMaintenanceResponsibility | undefined {
  if (ctx.workspaceCase.responsibility) return ctx.workspaceCase.responsibility;

  const fromAudit = inferResponsibilityFromAudit(ctx.workspaceCase.auditEntries);
  if (fromAudit) return fromAudit;

  if (ctx.item.responsibility && ctx.item.responsibility !== 'pending') {
    return ctx.item.responsibility;
  }

  return undefined;
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
