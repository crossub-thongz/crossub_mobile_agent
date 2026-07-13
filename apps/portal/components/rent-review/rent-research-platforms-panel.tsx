'use client';

import { AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

import { RENT_RESEARCH_PLATFORMS } from '@/lib/rent-review/agent-workflow-model';
import type { RentPlatformResearch } from '@/lib/rent-review/types';
import { cn, formatCurrency } from '@/lib/utils';

const PLATFORM_IDS = ['nsw_fair_trading', 'rp_data', 'rea'] as const;

const STATUS_META: Record<
  RentPlatformResearch['status'] | 'pending',
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
};

function platformTitle(platformName: string): string {
  return `Rent Research (${platformName})`;
}

function PlatformCard({
  title,
  platform,
}: {
  title: string;
  platform: RentPlatformResearch | null;
}) {
  const status = platform?.status ?? 'pending';
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className={cn('mt-1 inline-flex items-center gap-1 text-[11px] font-medium', meta.tone)}>
            <Icon className="size-3.5" />
            {meta.label}
          </p>
        </div>
        {platform?.sourceUrl ? (
          <a
            href={platform.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px]"
          >
            Source
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

export function RentResearchPlatformsPanel({
  platforms,
}: {
  platforms: RentPlatformResearch[];
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
          />
        );
      })}
    </div>
  );
}
