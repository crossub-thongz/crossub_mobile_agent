'use client';

import { AlertCircle, CheckCircle2, Clock, ExternalLink, FileImage, FileText, Loader2 } from 'lucide-react';

import type { RentPlatformResearch } from '@/lib/rent-review/types';
import { cn, formatCurrency } from '@/lib/utils';

const MARKET_RESEARCH_ESTIMATE_SECONDS = 30;

const PLATFORM_ROWS = [
  { id: 'nsw_fair_trading' as const, label: 'Fair Trading', fileType: 'jpg' as const },
  { id: 'rp_data' as const, label: 'RP Data', fileType: 'pdf' as const },
  { id: 'rea' as const, label: 'REA.com.au', fileType: 'jpg' as const },
];

const STATUS_META: Record<
  RentPlatformResearch['status'] | 'pending' | 'loading',
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  complete: { label: 'Complete', icon: CheckCircle2, tone: 'text-emerald-600' },
  failed: { label: 'Failed', icon: AlertCircle, tone: 'text-destructive' },
  pending_credentials: { label: 'API credentials required', icon: Clock, tone: 'text-amber-600' },
  insufficient_data: { label: 'Insufficient data', icon: AlertCircle, tone: 'text-muted-foreground' },
  pending: { label: 'Pending', icon: Clock, tone: 'text-muted-foreground' },
  loading: { label: 'Researching…', icon: Loader2, tone: 'text-primary' },
};

function FileTypeBadge({ type }: { type: 'jpg' | 'pdf' }) {
  const Icon = type === 'pdf' ? FileText : FileImage;
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
      <Icon className="size-3" />
      {type}
    </span>
  );
}

function PlatformResearchRow({
  index,
  label,
  fileType,
  platform,
  loading = false,
  readOnly = false,
}: {
  index: number;
  label: string;
  fileType: 'jpg' | 'pdf';
  platform: RentPlatformResearch | null;
  loading?: boolean;
  readOnly?: boolean;
}) {
  const status = loading ? 'loading' : (platform?.status ?? 'pending');
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-3',
        loading ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-muted/10',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {index}. Research on {label}{' '}
            <span className="text-muted-foreground font-normal">({fileType})</span>
          </p>
          <p className={cn('mt-1 inline-flex items-center gap-1 text-[11px] font-medium', meta.tone)}>
            <Icon className={cn('size-3.5', loading && 'animate-spin')} />
            {meta.label}
          </p>
        </div>
        {platform?.sourceUrl && !loading ? (
          <a
            href={platform.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
          >
            View source
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      {platform?.status === 'complete' && platform.medianWeekly != null ? (
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          Median {formatCurrency(platform.medianWeekly)}/wk
          {platform.rangeLow != null && platform.rangeHigh != null
            ? ` · range ${formatCurrency(platform.rangeLow)}–${formatCurrency(platform.rangeHigh)}`
            : ''}
        </p>
      ) : null}

      {platform?.summary ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{platform.summary}</p>
      ) : loading ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          Querying market data…
        </p>
      ) : status === 'pending' ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {readOnly
            ? 'Pending — admin will run market research from the admin portal.'
            : 'Runs when you confirm the rent review or rerun market research.'}
        </p>
      ) : null}

      {platform?.error ? (
        <p className="text-destructive mt-2 text-xs leading-relaxed">{platform.error}</p>
      ) : null}
    </li>
  );
}

export function RentResearchRunningBanner({
  elapsedSeconds,
  estimateSeconds = MARKET_RESEARCH_ESTIMATE_SECONDS,
}: {
  elapsedSeconds: number;
  estimateSeconds?: number;
}) {
  const progress = Math.min(95, Math.round((elapsedSeconds / estimateSeconds) * 100));

  return (
    <section className="border-primary/30 bg-primary/5 space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <Loader2 className="text-primary mt-0.5 size-5 shrink-0 animate-spin" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Running market research</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            NSW Fair Trading, RP Data, and REA.com.au — usually about {estimateSeconds} seconds.
            Elapsed {elapsedSeconds}s.
          </p>
        </div>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

export function RentResearchPlatformsPanel({
  platforms,
  loading = false,
  readOnly = false,
}: {
  platforms: RentPlatformResearch[];
  loading?: boolean;
  readOnly?: boolean;
}) {
  const byId = new Map(platforms.map((platform) => [platform.id, platform]));

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Rent research</p>
      <ol className="space-y-2">
        {PLATFORM_ROWS.map((row, index) => (
          <PlatformResearchRow
            key={row.id}
            index={index + 1}
            label={row.label}
            fileType={row.fileType}
            platform={byId.get(row.id) ?? null}
            loading={loading}
            readOnly={readOnly}
          />
        ))}
      </ol>
    </section>
  );
}
