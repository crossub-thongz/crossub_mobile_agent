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
  leasing: 'NL-',
  end_leasing: 'EL-',
  tribunal: 'T-',
};

/** Compact tenancy ref shown on the property profile, e.g. TEN0012. */
export function tenancyReferenceLabel(id: string): string {
  return formatPrefixedReference(id.trim(), 'TEN');
}

/** Compact workflow case ref (10 chars max): prefix + digits from id. */
export function workflowCaseReferenceLabel(
  id: string,
  kind: WorkflowCaseRefKind,
): string {
  return formatPrefixedReference(id.trim(), WORKFLOW_CASE_REF_PREFIX[kind]);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const COMPACT_UUID_RE = /^[0-9a-f]{32}$/i;

function compactHexId(value: string): string {
  return value.replace(/[^0-9a-f]/gi, '').toLowerCase();
}

/** True when a stored “reference” is still the raw case UUID. */
export function isRawCaseId(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (UUID_RE.test(trimmed) || COMPACT_UUID_RE.test(trimmed)) return true;
  const compact = compactHexId(trimmed);
  return compact.length === 32 && COMPACT_UUID_RE.test(compact) && trimmed.length >= 32;
}

/** Swap a case UUID (and compact variants) for the display task number. */
export function replaceRawCaseIdWithLabel(
  text: string,
  caseId: string,
  label: string,
): string {
  if (!text || !label) return text;
  let next = text;
  const trimmedId = caseId.trim();
  if (trimmedId && trimmedId !== label) next = next.split(trimmedId).join(label);
  const compact = compactHexId(trimmedId);
  if (!compact) return next;
  return next.replace(UUID_IN_TEXT_RE, (match) =>
    compactHexId(match) === compact ? label : match,
  );
}

/**
 * Maintenance jobs carry a real order number from the API (`MR-00057`) — the one
 * printed on emails, invoices and the staff console. Show it whenever it exists and
 * keep the synthetic `M-` ref only for rows that predate order numbering.
 */
export function maintenanceReferenceLabel(
  orderNumber: string | null | undefined,
  id: string,
): string {
  const trimmed = orderNumber?.trim();
  if (trimmed && !isRawCaseId(trimmed)) return trimmed;
  return workflowCaseReferenceLabel(id, 'maintenance');
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

/** UUID to hash for II-/OI-/RI-/OP- — OPEN viewing rows store the inspection UUID separately. */
export function inspectionRefSourceId(inspection: {
  id: string;
  inspectionRecordId?: string;
}): string {
  return inspection.inspectionRecordId?.trim() || inspection.id;
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
