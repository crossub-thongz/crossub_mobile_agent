import { ApiError } from '@/lib/api';

/**
 * Owner folio Pay/Collect (Accounting PRD Step 3, UAT 05): what the agent ticked, and why the API
 * refused it. Pure helpers, no React.
 */

/** Total of the ticked rows, in cents. */
export function selectedTotalCents(
  items: ReadonlyArray<{ id: string; amountCents: number }>,
  selected: ReadonlySet<string>,
): number {
  return items.reduce((sum, item) => (selected.has(item.id) ? sum + item.amountCents : sum), 0);
}

/** The ticked rows split by source, as the pay request wants them. */
export function selectionBody<S extends string>(
  items: ReadonlyArray<{ id: string; source: S }>,
  selected: ReadonlySet<string>,
  billSource: S,
): { billIds: string[]; feeChargeIds: string[] } {
  const picked = items.filter((item) => selected.has(item.id));
  return {
    billIds: picked.filter((item) => item.source === billSource).map((item) => item.id),
    feeChargeIds: picked.filter((item) => item.source !== billSource).map((item) => item.id),
  };
}

/** How much the owner was short when the API refused a Pay (409 with `shortfallCents`), else null. */
export function collectShortfallFromError(err: unknown): number | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const body = err.body;
  if (!body || typeof body !== 'object' || !('shortfallCents' in body)) return null;
  const shortfall = (body as { shortfallCents?: unknown }).shortfallCents;
  return typeof shortfall === 'number' && shortfall > 0 ? shortfall : null;
}
