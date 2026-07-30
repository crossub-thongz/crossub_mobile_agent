/**
 * "Tenant rejected" — a tenant-responsibility case the tenant refused (officer ask, demo
 * feedback 29 Jul 2026).
 *
 * A refusal now PARKS the case rather than closing it: the fault is still unrepaired and only who
 * pays is contested, so the API holds the job open on an active status awaiting an officer. Two
 * eras therefore exist — parked cases, and refusals answered before that change, which closed —
 * and the tenant's recorded answer identifies both. That answer is a fact on the job, not
 * something to infer from the audit trail.
 *
 * `TENANT_REJECTED_LABEL` is also the status a PARKED case reports, assigned once in
 * `mapAgentMaintenance` (`isOpenTenantRejectedCase`) so every table, filter and KPI that reads
 * `status` agrees without each one repeating the check. Closed refusals keep their real status.
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

/** True when the tenant DISAGREED with the responsibility call — parked or (legacy) closed. */
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
