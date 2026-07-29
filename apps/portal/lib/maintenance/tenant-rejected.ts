/**
 * "Tenant rejected" — a tenant-responsibility case the tenant refused (officer ask, demo
 * feedback 29 Jul 2026).
 *
 * Either answer to a tenant-responsibility decision closes the job, so on status alone a tenant
 * who accepted the charge and one who disputed it look identical — and only one of the two can
 * come back as a complaint or a tribunal matter. The API now records the answer on the job, so
 * the distinction is a fact to read rather than something to infer from the audit trail.
 *
 * Deliberately NOT folded into the workflow step model: the stepper describes what work the case
 * went through, and a rejection is an outcome, not a sixth step. It replaces the step label in
 * the list only, where an officer is scanning for what needs attention.
 */

import type { MaintenanceRequest } from '@/lib/types';

/** What the list calls it. Sentence case, matching the other status labels in the table. */
export const TENANT_REJECTED_LABEL = 'Tenant rejected';

/** Row + badge tone. Amber, one rung below the destructive red used for urgent/needs-approval. */
export const TENANT_REJECTED_ROW_CLASS =
  'border-l-4 border-l-amber-500 bg-amber-500/[0.06]';

export const TENANT_REJECTED_BADGE_CLASS =
  'inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300';

/** True when this job closed because the tenant DISAGREED with the responsibility call. */
export function isTenantRejectedMaintenance(request: MaintenanceRequest): boolean {
  return request.tenantResponsibilityResponse?.agreed === false;
}

/** The tenant's stated reason, for a tooltip. Null when they agreed or nothing was recorded. */
export function tenantRejectionReason(request: MaintenanceRequest): string | null {
  const recorded = request.tenantResponsibilityResponse;
  if (!recorded || recorded.agreed) return null;
  return recorded.reason?.trim() || null;
}

/** Hover text for the badge — the tenant's words, which is the only question a rejection raises. */
export function tenantRejectionTitle(request: MaintenanceRequest): string | undefined {
  const reason = tenantRejectionReason(request);
  return reason ? `Tenant's reason: ${reason}` : undefined;
}
