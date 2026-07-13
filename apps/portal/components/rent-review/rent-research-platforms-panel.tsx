'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react';

import { RENT_RESEARCH_PLATFORMS } from '@/lib/rent-review/agent-workflow-model';
import type { RentPlatformResearch } from '@/lib/rent-review/types';
import { cn, formatCurrency } from '@/lib/utils';

const PLATFORM_IDS = ['nsw_fair_trading', 'rp_data', 'rea'] as const;
const MARKET_RESEARCH_ESTIMATE_SECONDS = 30;

const STATUS_META: Record<
  RentPlatformResearch['status'] | 'pending' | 'loading',
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  complete: {
    label: 'Complete',
    icon: CheckCircle2,
    tone: 'text-emerald-600',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    tone: 'text-destructive',
  },
  pending_credentials: {
    label: 'API credentials required',
    icon: Clock,
    tone: 'text-amber-600',
  },
  insufficient_data: {
    label: 'Insufficient data',
    icon: AlertCircle,
    tone: 'text-muted-foreground',
  },
  pending: {
    label: 'Pending research',
    icon: Clock,
    tone: 'text-muted-foreground',
  },
  loading: {
    label: 'Researching…',
    icon: Loader2,
    tone: 'text-primary',
  },
};

function platformTitle(platformName: string): string {
  return `Rent Research (${platformName})`;
}

function PlatformCard({
  title,
  platform,
  loading = false,
}: {
  title: string;
  platform: RentPlatformResearch | null;
  loading?: boolean;
}) {
  const status = loading ? 'loading' : (platform?.status ?? 'pending');
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-4 transition-opacity',
        loading && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
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
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px]"
          >
            Source (Rent Check)
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      {platform?.status === 'complete' && platform.medianWeekly != null ? (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Median</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(platform.medianWeekly)}/wk</dd>
          </div>
          {platform.rangeLow != null && platform.rangeHigh != null ? (
            <div>
              <dt className="text-muted-foreground">Range</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(platform.rangeLow)}–{formatCurrency(platform.rangeHigh)}
              </dd>
            </div>
          ) : null}
          {platform.sampleCount != null ? (
            <div>
              <dt className="text-muted-foreground">Sample</dt>
              <dd className="font-medium tabular-nums">{platform.sampleCount}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {platform?.summary ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{platform.summary}</p>
      ) : loading ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Querying market data — this may take a little longer the first time NSW bond files are
          downloaded.
        </p>
      ) : status === 'pending' ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Runs when you confirm the rent review or rerun market research.
        </p>
      ) : null}
      {platform?.error ? (
        <p className="text-destructive mt-2 text-xs leading-relaxed">{platform.error}</p>
      ) : null}
    </section>
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
            NSW Fair Trading, RP Data, and REA Group Ltd — usually about {estimateSeconds} seconds.
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
}: {
  platforms: RentPlatformResearch[];
  loading?: boolean;
}) {
  const byId = new Map(platforms.map((platform) => [platform.id, platform]));

  return (
    <div className="space-y-3">
      {PLATFORM_IDS.map((id, index) => {
        const platformName = RENT_RESEARCH_PLATFORMS[index] ?? id;
        return (
          <PlatformCard
            key={id}
            title={platformTitle(platformName)}
            platform={byId.get(id) ?? null}
            loading={loading}
          />
        );
      })}
    </div>
  );
}
