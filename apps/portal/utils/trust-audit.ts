import {
  TRUST_AUDIT_ACTION_ORDER,
  TRUST_AUDIT_COPY,
  TRUST_AUDIT_EMPTY_DISPLAY,
  TRUST_AUDIT_ENTITY_ORDER,
  TRUST_AUDIT_SUMMARY_KEYS_MAX,
  type TrustAuditAction,
  type TrustAuditEntityType,
} from '@/constants/trust-settings';

/** Audit log helpers (D80, D135), pure; mirrors the staff web's `utils/trust-audit.ts`. */

type AuditSide = Record<string, unknown> | null | undefined;

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Field names whose value differs between before and after, in the order they first appear. */
export function auditChangedKeys(before: AuditSide, after: AuditSide): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const side of [after, before]) {
    if (!side) continue;
    for (const key of Object.keys(side)) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (!same(before?.[key], after?.[key])) keys.push(key);
    }
  }
  return keys;
}

/** "Changed status, note +2 more" / "Recorded amountCents, ledgerId" / "—". */
export function auditChangeSummary(before: AuditSide, after: AuditSide): string {
  const keys = auditChangedKeys(before, after);
  if (keys.length === 0) return TRUST_AUDIT_EMPTY_DISPLAY;
  const verb = before ? TRUST_AUDIT_COPY.changed : TRUST_AUDIT_COPY.recorded;
  const named = keys.slice(0, TRUST_AUDIT_SUMMARY_KEYS_MAX).join(', ');
  const rest = keys.length - TRUST_AUDIT_SUMMARY_KEYS_MAX;
  return rest > 0 ? `${verb} ${named} +${rest} ${TRUST_AUDIT_COPY.more}` : `${verb} ${named}`;
}

/** Pretty JSON for the before / after panes; null when nothing is recorded. */
export function formatAuditJson(value: AuditSide): string | null {
  if (!value || Object.keys(value).length === 0) return null;
  return JSON.stringify(value, null, 2);
}

export function isTrustAuditAction(value: string | null | undefined): value is TrustAuditAction {
  return TRUST_AUDIT_ACTION_ORDER.some((action) => action === value);
}

export function isTrustAuditEntityType(value: string | null | undefined): value is TrustAuditEntityType {
  return TRUST_AUDIT_ENTITY_ORDER.some((entity) => entity === value);
}

/** Either date may be empty; when both are set, from is on or before to. */
export function isAuditDateRangeValid({ from, to }: { from: string; to: string }): boolean {
  return !from || !to || from <= to;
}

/** How many pages `total` rows fill, at least one. */
export function auditPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
