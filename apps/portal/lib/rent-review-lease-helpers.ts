export type FixedTermWeeks = 26 | 52;

export type RentReviewLeaseType = 'fixed' | 'periodic';

export function formatRentReviewTermLabel(
  leaseType?: RentReviewLeaseType | null,
  fixedTermWeeks?: number | null,
): string {
  if (leaseType === 'periodic') return 'Periodic';
  if (leaseType === 'fixed') {
    if (fixedTermWeeks != null && fixedTermWeeks > 0) {
      return `Fixed term · ${fixedTermWeeks} wks`;
    }
    return 'Fixed term';
  }
  return '—';
}

export function isoDateAddDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function leaseEndFromFixedTermWeeks(startDate: string, weeks: FixedTermWeeks): string {
  return isoDateAddDays(startDate, weeks * 7);
}

export function parseLeaseTermWeeks(leaseTerm: string | null | undefined): FixedTermWeeks | undefined {
  if (!leaseTerm) return undefined;
  const lower = leaseTerm.toLowerCase();
  if (lower.includes('6') && lower.includes('month')) return 26;
  if (lower.includes('12') || lower.includes('year') || lower.includes('52')) return 52;
  if (lower.includes('26')) return 26;
  return undefined;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Preferred lease start for a rent review — mirrors crossub_web `derivePreferredLeaseStart`. */
export function derivePreferredLeaseStart(input: {
  leaseEnd?: string | null;
  agreementEnd?: string | null;
  termAnchor?: string | null;
  fixedTermWeeks?: FixedTermWeeks;
}): { date: string; hint: string; leaseTermAnchor?: string } {
  if (input.leaseEnd) {
    const leaseEnd = input.leaseEnd.slice(0, 10);
    return {
      date: isoDateAddDays(leaseEnd, 1),
      hint: 'Day after current tenancy lease end',
    };
  }

  if (input.agreementEnd) {
    const agreementEnd = input.agreementEnd.slice(0, 10);
    return {
      date: isoDateAddDays(agreementEnd, 1),
      hint: 'Day after leasing agreement end date',
    };
  }

  const anchor = input.termAnchor?.slice(0, 10);
  const weeks = input.fixedTermWeeks ?? 52;

  if (anchor) {
    const leaseEnd = leaseEndFromFixedTermWeeks(anchor, weeks);
    return {
      date: isoDateAddDays(leaseEnd, 1),
      hint: `Day after ${weeks}-week term ending`,
      leaseTermAnchor: anchor,
    };
  }

  const noticeFloor = isoDateAddDays(todayIso(), 60);
  return {
    date: isoDateAddDays(noticeFloor, 1),
    hint: 'Default · 60-day NSW notice horizon (no lease end on file)',
  };
}
