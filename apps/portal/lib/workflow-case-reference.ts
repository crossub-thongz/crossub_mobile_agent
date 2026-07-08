/**
 * Compact workflow case references — mirrors crossub_web
 * `modules/properties/property-portal-utils.ts`.
 */

const PORTAL_REF_TOTAL_LENGTH = 10;

function formatPrefixedReference(rawId: string, prefix: string): string {
  const suffixLength = PORTAL_REF_TOTAL_LENGTH - prefix.length;
  const digits = rawId.replace(/\D/g, '');
  const suffix = (digits.length > 0 ? digits : rawId.replace(/[^a-z0-9]/gi, ''))
    .slice(0, suffixLength)
    .toUpperCase();
  if (!suffix) return prefix.slice(0, PORTAL_REF_TOTAL_LENGTH);
  return `${prefix}${suffix}`.slice(0, PORTAL_REF_TOTAL_LENGTH);
}

export type InspectionCaseRefKind = 'routine' | 'ingoing' | 'outgoing' | 'open';

export type WorkflowCaseRefKind =
  | InspectionCaseRefKind
  | 'maintenance'
  | 'rent_review'
  | 'leasing'
  | 'end_leasing'
  | 'tribunal';

const WORKFLOW_CASE_REF_PREFIX: Record<WorkflowCaseRefKind, string> = {
  routine: 'RI-',
  ingoing: 'II-',
  outgoing: 'OI-',
  open: 'OP-',
  maintenance: 'M-',
  rent_review: 'RR-',
  leasing: 'EL-',
  end_leasing: 'NL-',
  tribunal: 'T-',
};

/** Compact workflow case ref (10 chars max): prefix + digits from id. */
export function workflowCaseReferenceLabel(
  id: string,
  kind: WorkflowCaseRefKind,
): string {
  return formatPrefixedReference(id.trim(), WORKFLOW_CASE_REF_PREFIX[kind]);
}

export function inspectionCaseReferenceLabel(
  id: string,
  kind: InspectionCaseRefKind,
): string {
  return workflowCaseReferenceLabel(id, kind);
}

export type InspectionTypeRef = 'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE';

const INSPECTION_TYPE_TO_REF_KIND: Record<InspectionTypeRef, InspectionCaseRefKind> = {
  OPEN: 'open',
  INGOING: 'ingoing',
  OUTGOING: 'outgoing',
  ROUTINE: 'routine',
};

export function inspectionReferenceLabel(id: string, type: InspectionTypeRef): string {
  return inspectionCaseReferenceLabel(id, INSPECTION_TYPE_TO_REF_KIND[type]);
}

/** Lease approval reference for ingoing create — mirrors crossub_web prefill. */
export function leasingCycleApprovalRef(
  cycleId?: string | null,
  tenancyAgreementId?: string | null,
): string {
  if (tenancyAgreementId?.trim()) return tenancyAgreementId.trim();
  if (cycleId?.trim()) return `LC-${cycleId.trim().slice(0, 8)}`;
  return '';
}
