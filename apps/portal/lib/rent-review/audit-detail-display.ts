import type { RentReviewAuditEntry } from '@/lib/rent-review/types';

interface RentReviewEmailSnapshot {
  subject: string;
  body: string;
  from: string;
  to: string;
  toEmail?: string;
  fromEmail?: string;
  channel?: 'email' | 'message';
}

/** Parse JSON email snapshot stored on comms audit entries (e.g. tenant notice dispatch). */
export function parseRentReviewEmailSnapshot(
  detail: string | undefined,
): RentReviewEmailSnapshot | null {
  if (!detail?.trim()) return null;
  try {
    const parsed = JSON.parse(detail) as Partial<RentReviewEmailSnapshot>;
    if (
      typeof parsed.subject === 'string' &&
      typeof parsed.body === 'string' &&
      typeof parsed.from === 'string' &&
      typeof parsed.to === 'string'
    ) {
      return parsed as RentReviewEmailSnapshot;
    }
  } catch {
    /* legacy plain-text detail */
  }
  return null;
}

/** Human-readable audit detail — hides raw JSON email payloads. */
export function formatRentReviewAuditDetail(
  entry: Pick<RentReviewAuditEntry, 'detail'>,
): string | null {
  const raw = entry.detail?.trim();
  if (!raw) return null;

  const snapshot = parseRentReviewEmailSnapshot(raw);
  if (snapshot) {
    const channel = snapshot.channel === 'message' ? 'Message' : 'Email';
    return `${channel} to ${snapshot.to} · ${snapshot.subject}`;
  }

  return raw;
}
