'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Home,
  Scale,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react';

import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { formatTitleCase, formatEnumLabel } from '@/lib/display-text';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type {
  MaintenanceRequest,
  NeedActionCategory,
  Property,
  PropertyNeedAction,
  RentReviewCase,
  TribunalCase,
} from '@/lib/types';

const ATTENTION_FROST_ACCENT: Record<NeedActionCategory, string> = {
  Maintenance: 'border-rose-300/55',
  Leasing: 'border-amber-300/55',
  Tribunal: 'border-sky-300/55',
  Inspection: 'border-emerald-300/55',
  Accounting: 'border-violet-300/55',
  Others: 'border-border/55',
};

const CATEGORY_ICON: Record<NeedActionCategory, LucideIcon> = {
  Maintenance: Wrench,
  Leasing: Home,
  Tribunal: Scale,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Others: AlertCircle,
};

const ATTENTION_SURFACE: Record<
  NeedActionCategory,
  { icon: string; card: string; button: string }
> = {
  Maintenance: {
    icon: 'bg-rose-500/15 text-rose-600',
    card: 'border-rose-200/80 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/5',
    button: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15',
  },
  Leasing: {
    icon: 'bg-amber-500/15 text-amber-700',
    card: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/5',
    button: 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/15',
  },
  Tribunal: {
    icon: 'bg-sky-500/15 text-sky-700',
    card: 'border-sky-200/80 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/5',
    button: 'bg-sky-500/10 text-sky-800 hover:bg-sky-500/15',
  },
  Inspection: {
    icon: 'bg-emerald-500/15 text-emerald-700',
    card: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/5',
    button: 'bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15',
  },
  Accounting: {
    icon: 'bg-violet-500/15 text-violet-700',
    card: 'border-violet-200/80 bg-violet-50/80 dark:border-violet-500/20 dark:bg-violet-500/5',
    button: 'bg-violet-500/10 text-violet-800 hover:bg-violet-500/15',
  },
  Others: {
    icon: 'bg-muted text-muted-foreground',
    card: 'border-border bg-card',
    button: 'bg-muted text-foreground hover:bg-muted/80',
  },
};

const CATEGORY_TEXT: Record<NeedActionCategory, string> = {
  Maintenance: 'text-rose-600',
  Leasing: 'text-amber-700',
  Tribunal: 'text-sky-700',
  Inspection: 'text-emerald-700',
  Accounting: 'text-violet-700',
  Others: 'text-muted-foreground',
};

function shortNeedLabel(label: string): string {
  return formatTitleCase(label.replace(/\s+required$/i, ''));
}

export function attentionItemSubtext(
  item: PropertyNeedAction,
  ctx: {
    maintenanceAll: MaintenanceRequest[];
    rentReviews: RentReviewCase[];
    tribunalCases: TribunalCase[];
    properties: Property[];
    formatMoney: (amount: number) => string;
  },
): string {
  const { maintenanceAll, rentReviews, tribunalCases, properties, formatMoney } = ctx;

  if (item.id.startsWith('mnt-')) {
    const job = maintenanceAll.find((m) => item.id === `mnt-${m.id}`);
    if (job) {
      const detail = job.requiresApproval ? 'Quote received' : formatEnumLabel(job.status);
      return `${formatTitleCase(job.title)} · ${detail}`;
    }
  }

  if (item.id.startsWith('rr-')) {
    const review = rentReviews.find((r) => item.id === `rr-${r.id}`);
    if (review) {
      const days = Math.max(
        0,
        Math.ceil((Date.parse(review.leaseEnd) - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      return `Lease expires in ${days} days · Current rent ${formatMoney(review.currentRent)}/w`;
    }
  }

  if (item.id.startsWith('lease-expiry-')) {
    const property = properties.find((p) => p.id === item.propertyId);
    if (property?.nextRentReview) {
      const days = Math.max(
        0,
        Math.ceil((Date.parse(property.nextRentReview) - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      const rent = property.rentPerWeek;
      const rentPart = rent != null ? ` · Current rent ${formatMoney(rent)}/w` : '';
      return `Lease expires in ${days} days${rentPart}`;
    }
  }

  if (item.id.startsWith('trib-')) {
    const tribunal = tribunalCases.find((t) => item.id === `trib-${t.id}`);
    if (tribunal?.hearingDate) {
      return `Hearing scheduled · ${formatDate(tribunal.hearingDate)}`;
    }
    if (tribunal?.matter) return formatTitleCase(tribunal.matter);
  }

  return formatTitleCase(item.label);
}

export function DashboardAttentionCard({
  item,
  note,
  subtext,
  onOpen,
  compact = false,
  mobile = false,
}: {
  item: PropertyNeedAction;
  note?: string | null;
  subtext?: string | null;
  onOpen?: () => void;
  compact?: boolean;
  mobile?: boolean;
}) {
  const Icon = CATEGORY_ICON[item.category];
  const surface = ATTENTION_SURFACE[item.category];
  const actionLabel = item.category === 'Tribunal' ? 'View' : 'Review';
  const categoryLabel = shortNeedLabel(item.label);

  if (mobile) {
    return (
      <Link
        href={item.href}
        onClick={onOpen}
        className={cn(
          'v2-dashboard__attention-card block rounded-2xl p-3 transition hover:opacity-95',
          ATTENTION_FROST_ACCENT[item.category],
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl',
              surface.icon,
            )}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs font-semibold', CATEGORY_TEXT[item.category])}>{categoryLabel}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug">{item.propertyAddress}</p>
            {subtext ? (
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{subtext}</p>
            ) : null}
            {note ? (
              <p className="text-primary mt-2 flex items-start gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-[10px] leading-snug">
                <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden />
                <span>{note}</span>
              </p>
            ) : null}
            <div className="mt-2 flex items-center justify-end gap-2">
              {item.updatedAt ? (
                <span className="text-muted-foreground text-[10px]">{formatRelative(item.updatedAt)}</span>
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                  surface.button,
                )}
              >
                {actionLabel}
                <ChevronRight className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className={cn(
        'v2-dashboard__attention-card block border transition hover:opacity-95',
        compact ? 'rounded-xl p-2.5' : 'rounded-2xl p-4',
        ATTENTION_FROST_ACCENT[item.category],
      )}
    >
      <div className={cn('flex items-start', compact ? 'gap-2.5' : 'gap-3')}>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg',
            compact ? 'size-8' : 'size-10 rounded-xl',
            surface.icon,
          )}
        >
          <Icon className={compact ? 'size-3.5' : 'size-4'} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>
              {shortNeedLabel(item.label)}
            </p>
            {item.updatedAt ? (
              <span className={cn('text-muted-foreground shrink-0', compact ? 'text-[10px]' : 'text-[11px]')}>
                {formatRelative(item.updatedAt)}
              </span>
            ) : null}
          </div>
          <p className={cn('font-medium', compact ? 'mt-0.5 truncate text-xs' : 'mt-1 text-sm')}>
            {item.propertyAddress}
          </p>
          {!compact ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{formatTitleCase(item.label)}</p>
          ) : null}
          {note ? (
            <p
              className={cn(
                'text-primary rounded-md bg-primary/10 leading-snug',
                compact ? 'mt-1.5 px-2 py-1 text-[10px]' : 'mt-2 rounded-lg px-2.5 py-1.5 text-[11px]',
              )}
            >
              {note}
            </p>
          ) : null}
        </div>
      </div>
      <div className={cn('flex justify-end', compact ? 'mt-2' : 'mt-3')}>
        <span
          className={cn(
            'inline-flex items-center rounded-md font-semibold',
            compact ? 'px-2 py-1 text-[10px]' : 'rounded-lg px-3 py-1.5 text-xs',
            surface.button,
          )}
        >
          {actionLabel}
          <ChevronRight className={compact ? 'size-3' : 'size-3.5'} />
        </span>
      </div>
    </Link>
  );
}

export function crosNoteForAttentionItem(
  item: PropertyNeedAction,
  maintenanceAll: { id: string; quoteAmount?: number; recommendation?: string }[],
  rentReviews: { id: string; propertyId: string; suggestedRent: number }[],
  formatMoney: (amount: number) => string,
): string | null {
  if (item.category === 'Maintenance') {
    const job = maintenanceAll.find((m) => item.id === `mnt-${m.id}`);
    if (job?.recommendation?.trim()) return job.recommendation.trim();
    if (job?.quoteAmount != null) {
      return `${CROS_ASSISTANT_NAME} recommends approval – ${formatMoney(job.quoteAmount)} incl. GST`;
    }
  }
  if (item.category === 'Leasing') {
    const review = rentReviews.find((r) => r.propertyId === item.propertyId);
    if (review?.suggestedRent) {
      return `${CROS_ASSISTANT_NAME} recommends ${formatMoney(review.suggestedRent)}/week`;
    }
  }
  return null;
}
