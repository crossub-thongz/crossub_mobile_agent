'use client';

import type { GiiAssessment } from '@/lib/crossub-api/gii-client';
import { cn } from '@/lib/utils';

/**
 * The vacate breakdown behind a Gii reply.
 *
 * Every number is the server engine's — shown with its working (`2 weeks × $1,000.00`)
 * so an agent can check it at a glance, and so it is evident the assistant did no
 * arithmetic of its own. Day counts lead and the percentage follows: 243 + 122 = 365
 * reconciles on screen.
 *
 * Stacked rather than columnar — this renders inside a phone-width sheet.
 */

const CASE_LABEL: Record<string, string> = {
  BREAK_LEASE: 'Break lease',
  FIXED_TERM_NOTICE: 'End of fixed term',
  PERIODIC_NOTICE: 'Periodic notice',
};

/** Amber for the outcome that costs the tenant money; the other two do not. */
const CASE_TONE: Record<string, string> = {
  BREAK_LEASE: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  FIXED_TERM_NOTICE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  PERIODIC_NOTICE: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

const money = (n: number | null | undefined) => {
  const value = n == null ? null : typeof n === 'number' ? n : Number(n);
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function Row({
  label,
  working,
  value,
  strong,
}: {
  label: string;
  working?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        {working ? (
          <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
            {working}
          </span>
        ) : null}
        <span
          className={cn(
            'shrink-0 tabular-nums',
            strong ? 'text-sm font-semibold' : 'text-xs font-medium',
          )}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

export function GiiAssessmentCard({ assessment }: { assessment: GiiAssessment }) {
  const { term, breakFee, notice, rent } = assessment;
  const weekly = assessment.weeklyRent;
  const pct = term ? term.pctElapsed * 100 : null;
  const isBreak = assessment.case === 'BREAK_LEASE';
  const total = (breakFee?.totalFee ?? 0) + (rent?.amountOwed ?? 0);
  const showTotal = Boolean(breakFee) && Boolean(rent?.amountOwed);

  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            CASE_TONE[assessment.case] ?? 'bg-secondary text-foreground',
          )}
        >
          {CASE_LABEL[assessment.case] ?? assessment.case}
        </span>
        <p className="min-w-0 truncate text-right text-[11px] font-medium">
          {assessment.propertyLabel}
        </p>
      </div>

      <div className="space-y-3 p-3">
        <p className="text-muted-foreground truncate text-[10px]">
          {assessment.leaseStartDate && assessment.leaseEndDate
            ? `${assessment.leaseStartDate} – ${assessment.leaseEndDate}`
            : assessment.basis}
          {weekly != null ? ` · ${money(weekly)}/wk` : ''}
        </p>

        {term ? (
          <div className="space-y-1.5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-base font-semibold tabular-nums">{term.daysOccupied}</p>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wide">
                  days occupied
                </p>
              </div>
              <div>
                <p className="text-base font-semibold tabular-nums">{term.daysRemaining}</p>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wide">
                  days remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums">{pct!.toFixed(1)}%</p>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wide">
                  of term
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(100, Math.max(0, pct!))}%` }}
              />
            </div>
            {breakFee ? (
              <p className="text-muted-foreground text-[10px]">Band {breakFee.band}</p>
            ) : null}
          </div>
        ) : null}

        {(breakFee || rent || assessment.dailyRentDisplay) && (
          <div className="space-y-1 border-t pt-2.5">
            {breakFee && weekly != null ? (
              <Row
                label="Break fee"
                working={`${breakFee.weeks} ${breakFee.weeks === 1 ? 'wk' : 'wks'} × ${money(weekly)}`}
                value={money(breakFee.totalFee)}
              />
            ) : null}
            {assessment.dailyRentDisplay && weekly != null ? (
              <Row
                label="Daily rent"
                working={`${money(weekly)} ÷ 7`}
                value={`$${assessment.dailyRentDisplay}`}
              />
            ) : null}
            {rent && rent.daysOwed > 0 ? (
              <Row
                label="Rent owed"
                working={`${rent.daysOwed} days`}
                value={money(rent.amountOwed)}
              />
            ) : null}
            {rent && rent.creditDays > 0 ? (
              <Row
                label="Rent credit"
                working={`${rent.creditDays} days ahead`}
                value={money(rent.creditAmount)}
              />
            ) : null}
            {showTotal ? (
              <div className="border-t pt-1.5">
                <Row label="Total" value={money(total)} strong />
              </div>
            ) : null}
          </div>
        )}

        {notice && !isBreak ? (
          <div className="flex items-center justify-between gap-2 border-t pt-2.5">
            <span className="text-muted-foreground text-xs">
              Notice <span className="text-foreground tabular-nums">{notice.noticeDays}d</span> ·
              min <span className="text-foreground tabular-nums">{notice.minDays}d</span>
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                notice.sufficient
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
              )}
            >
              {notice.sufficient ? 'Sufficient' : 'Short notice'}
            </span>
          </div>
        ) : null}

        <div className="space-y-0.5 border-t pt-2.5">
          {assessment.ruleCitations.map((c) => (
            <p key={c} className="text-muted-foreground text-[9px] leading-relaxed">
              {c}
            </p>
          ))}
          <p className="text-muted-foreground text-[9px]">
            Advisory estimate — confirm before issuing.
          </p>
        </div>
      </div>
    </div>
  );
}
