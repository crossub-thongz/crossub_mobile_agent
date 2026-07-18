import type { InspectionRecord, OnSiteProgression } from '@/lib/inspections-types';

export type InspectionCaseAuditEntry = {
  id: string;
  label: string;
  actor: string;
  at: string;
};

/**
 * Merge API caseAudit with evidence-derived rows (key collect/return, tenant ack)
 * so the agent Job Case stays complete even when older races wiped meta stamps.
 */
export function mergeInspectionCaseAudit(input: {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  leasingTenantApproved?: boolean;
  tenantName?: string | null;
}): InspectionCaseAuditEntry[] {
  const byId = new Map<string, InspectionCaseAuditEntry>();
  for (const entry of input.record?.caseAudit ?? []) {
    byId.set(entry.id, entry);
  }

  const hasLabel = (re: RegExp) =>
    [...byId.values()].some((e) => re.test(e.label));

  const inspectorActor =
    input.progression?.inspectorName?.trim()
      ? `${input.progression.inspectorName.trim()} (Inspector)`
      : input.record?.inspectorName?.trim()
        ? `${input.record.inspectorName.trim()} (Inspector)`
        : 'Inspector';

  const custody = input.progression?.keyCustody;
  const inspectionId = input.record?.id ?? input.progression?.inspectionId ?? 'inspection';

  if (
    (custody?.collectComplete || (custody?.collectPhotos?.length ?? 0) > 0 || custody?.collectedAt) &&
    !hasLabel(/key collection proof/i)
  ) {
    const at = custody?.collectedAt ?? input.record?.updatedAt ?? new Date().toISOString();
    byId.set(`audit-key-collect-${inspectionId}`, {
      id: `audit-key-collect-${inspectionId}`,
      label: 'Key collection proof recorded',
      actor: inspectorActor,
      at,
    });
  }

  if (
    (custody?.returnComplete || (custody?.returnPhotos?.length ?? 0) > 0 || custody?.returnedAt) &&
    !hasLabel(/key return proof/i)
  ) {
    const at = custody?.returnedAt ?? input.record?.updatedAt ?? new Date().toISOString();
    byId.set(`audit-key-return-${inspectionId}`, {
      id: `audit-key-return-${inspectionId}`,
      label: 'Key return proof recorded',
      actor: inspectorActor,
      at,
    });
  }

  const tenantAcked =
    Boolean(input.record?.tenantReportSigned) || Boolean(input.leasingTenantApproved);
  if (tenantAcked && !hasLabel(/tenant acknowledgement/i)) {
    const tenantLabel = input.tenantName?.trim() || input.record?.tenantName?.trim() || 'Tenant';
    byId.set(`audit-tenant-ack-${inspectionId}`, {
      id: `audit-tenant-ack-${inspectionId}`,
      label: 'Tenant acknowledgement recorded',
      actor: `${tenantLabel} (Tenant)`,
      at: input.record?.completedDate ?? input.record?.updatedAt ?? new Date().toISOString(),
    });
  }

  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}
