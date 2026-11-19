import { ApiError } from '@/lib/api';

/**
 * Accounting PRD Step 3: the API refuses a bill whose supplier already has a bill with the same
 * invoice number (409 with `duplicateBillNumbers`) until the agent confirms it. Returns those bill
 * numbers, or null when the error is anything else.
 */
export function duplicateBillNumbersFromError(err: unknown): number[] | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const body = err.body;
  if (!body || typeof body !== 'object' || !('duplicateBillNumbers' in body)) return null;
  const numbers = (body as { duplicateBillNumbers?: unknown }).duplicateBillNumbers;
  if (!Array.isArray(numbers) || numbers.length === 0) return null;
  return numbers.filter((n): n is number => typeof n === 'number');
}
