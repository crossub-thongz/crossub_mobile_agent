'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, ClipboardCheck, Clock3, Sparkles, X } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { inspectionDetail, ROUTES } from '@/constants/routes';
import {
  buildServiceRecommendations,
  SERVICE_RECOMMENDATION_BATCH_COUNT,
  SERVICE_RECOMMENDATION_SNOOZE_DAYS,
  SERVICE_RECOMMENDATION_URGENT_DAYS,
  type ServiceRecommendationOffer,
} from '@/lib/service-recommendation';
import { serviceRecommendationSamples } from '@/lib/service-recommendation-samples';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'crossub.service-recommendation.v1';

function bookHref(inspectionId: string): string {
  return inspectionId.startsWith('sample-') ? ROUTES.INSPECTIONS : inspectionDetail(inspectionId);
}

type RecommendationMemory = {
  snoozeUntil?: string;
  dismissed?: boolean;
};

type Surface = 'home' | 'inspections' | 'task' | 'cros';

function readMemory(): Record<string, RecommendationMemory> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      RecommendationMemory
    >;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function visibleOffers(
  offers: ServiceRecommendationOffer[],
  memory: Record<string, RecommendationMemory>,
  now: number,
): ServiceRecommendationOffer[] {
  return offers.filter((offer) => {
    const entry = memory[offer.id];
    if (!entry) return true;
    if (entry.dismissed) return false;
    if (entry.snoozeUntil && Date.parse(entry.snoozeUntil) > now) return false;
    return true;
  });
}

/**
 * Self-Manage assistance card. Home, Inspections, the inspection task and CROS share one
 * snooze/dismiss record, so hiding it in one place hides it in the others.
 */
export function ServiceRecommendation({
  surface,
  inspectionId,
}: {
  surface: Surface;
  /** On an inspection task, only that job's offer is shown. */
  inspectionId?: string;
}) {
  const { inspections, properties, agencies, needActionItems } = useAgentData();
  const { user } = useAuth();
  const [memory, setMemory] = useState<Record<string, RecommendationMemory>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMemory(readMemory());
    setReady(true);
  }, []);

  const save = useCallback((next: Record<string, RecommendationMemory>) => {
    setMemory(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const offers = useMemo(() => {
    const samples = serviceRecommendationSamples(user?.email, agencies);
    return buildServiceRecommendations({
      inspections: [...inspections, ...samples.inspections],
      properties: [...properties, ...samples.properties],
      agencies,
    });
  }, [agencies, inspections, properties, user?.email]);
  const shown = useMemo(
    () => visibleOffers(offers, memory, Date.now()),
    [memory, offers],
  );
  const scoped = inspectionId ? shown.filter((offer) => offer.id === inspectionId) : shown;
  const lead = scoped[0];
  const batch = surface === 'cros' && scoped.length >= SERVICE_RECOMMENDATION_BATCH_COUNT;
  const urgent = lead != null && lead.days <= SERVICE_RECOMMENDATION_URGENT_DAYS;

  if (!ready || !lead) return null;
  if (surface === 'cros' && !batch && !urgent) return null;

  const snooze = (id: string) => {
    const until = new Date();
    until.setDate(until.getDate() + SERVICE_RECOMMENDATION_SNOOZE_DAYS);
    save({ ...memory, [id]: { snoozeUntil: until.toISOString() } });
  };
  const dismiss = (id: string) => {
    save({ ...memory, [id]: { dismissed: true } });
  };

  const emphasizeFull =
    surface === 'home' &&
    needActionItems.length >= SERVICE_RECOMMENDATION_BATCH_COUNT &&
    lead.days > SERVICE_RECOMMENDATION_URGENT_DAYS;

  return (
    <div className="space-y-3">
      {batch ? <CrosBatchSuggestion count={scoped.length} includeWays={!urgent} /> : null}
      {surface === 'cros' && batch && !urgent ? null : (
        <AssistanceCard
          offer={lead}
          emphasizeFull={emphasizeFull}
          emphasizeInspection={urgent}
          onSnooze={() => snooze(lead.id)}
          onDismiss={() => dismiss(lead.id)}
        />
      )}
    </div>
  );
}

function AssistanceCard({
  offer,
  emphasizeFull,
  emphasizeInspection,
  onSnooze,
  onDismiss,
}: {
  offer: ServiceRecommendationOffer;
  emphasizeFull: boolean;
  emphasizeInspection: boolean;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const inspectionFirst = !emphasizeFull;
  return (
    <section className="rounded-2xl border border-[#d7eee6] bg-white p-4 shadow-[0_9px_26px_rgba(26,89,70,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          <CalendarClock className="size-3.5" />
          Inspection due soon
        </span>
        <span className="text-muted-foreground text-xs">{offer.address}</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">Would you like Crossub to help?</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {offer.dueLabel} Choose how you&apos;d like to manage this property.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {inspectionFirst ? (
          <>
            <InspectionOnlyChoice href={bookHref(offer.id)} primary={emphasizeInspection || !emphasizeFull} />
            <FullServiceChoice primary={emphasizeFull} />
          </>
        ) : (
          <>
            <FullServiceChoice primary />
            <InspectionOnlyChoice href={bookHref(offer.id)} primary={false} />
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">You can always continue managing it yourself.</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSnooze} className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
            <Clock3 className="size-3.5" />
            Remind me in {SERVICE_RECOMMENDATION_SNOOZE_DAYS} days
          </button>
          <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Not interested">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <WaysCrosHelps />
    </section>
  );
}

function InspectionOnlyChoice({ href, primary }: { href: string; primary: boolean }) {
  return (
    <div className="flex h-full flex-col rounded-xl border p-3">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="size-4 text-[#067a56]" />
        Inspection Only
      </p>
      <p className="text-muted-foreground mt-1 text-xs">One-off assistance</p>
      <p className="mt-2 text-sm">Let Crossub complete this inspection while you retain full management.</p>
      <Link
        href={href}
        className={cn(
          'mt-3 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold',
          primary ? 'bg-[#00bd85] text-white' : 'border border-[#ccece3] text-[#067a56]',
        )}
      >
        Book inspection
      </Link>
    </div>
  );
}

function FullServiceChoice({ primary }: { primary: boolean }) {
  return (
    <div className="flex h-full flex-col rounded-xl border p-3">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Building2 className="text-muted-foreground size-4" />
        Full Service
      </p>
      <p className="text-muted-foreground mt-1 text-xs">Ongoing management</p>
      <p className="mt-2 text-sm">Let Crossub handle inspections, tenant communication and daily operations.</p>
      <p className="text-muted-foreground mt-2 text-[11px]">
        Price, scope and start date are confirmed on the next page. This does not change the property&apos;s management.
      </p>
      <Link
        href={ROUTES.PRICING}
        className={cn(
          'mt-3 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold',
          primary ? 'bg-[#00bd85] text-white' : 'border border-[#ccece3] text-[#067a56]',
        )}
      >
        Explore Full Service
      </Link>
    </div>
  );
}

function CrosBatchSuggestion({ count, includeWays }: { count: number; includeWays: boolean }) {
  return (
    <section className="rounded-xl border border-[#d7eee6] bg-[#f7faf9] p-3">
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-[#067a56]" />
        {CROS_ASSISTANT_NAME}
        <span className="rounded-full bg-[#e7f8f2] px-2 py-0.5 text-[11px] font-semibold text-[#067a56]">Suggestion</span>
      </p>
      <p className="mt-2 text-sm">
        You have {count} upcoming inspections that haven&apos;t been arranged yet.
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        I can help you arrange these through Crossub&apos;s Inspection Only service, or you can explore Full Service if you&apos;d prefer ongoing management support.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={ROUTES.INSPECTIONS} className="rounded-lg bg-[#00bd85] px-3 py-2 text-sm font-semibold text-white">
          Arrange inspections
        </Link>
        <Link href={ROUTES.PRICING} className="rounded-lg border border-[#ccece3] px-3 py-2 text-sm font-semibold text-[#067a56]">
          Explore Full Service
        </Link>
      </div>
      {includeWays ? <WaysCrosHelps /> : null}
    </section>
  );
}

function WaysCrosHelps() {
  return (
    <div className="mt-4 border-t border-[#e7f2ee] pt-3">
      <h3 className="text-sm font-semibold">3 ways {CROS_ASSISTANT_NAME} helps</h3>
      <ol className="mt-2 space-y-2 text-sm">
        <li>
          <p className="font-medium">Free inspection*</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Use the free inspection app. The report is sent only to CROSSUB and cannot be sent anywhere else, so the app can only be used inside CROSSUB.
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            * The {CROS_ASSISTANT_NAME} inspection is exclusive to the CROSSUB system.
          </p>
        </li>
        <li>
          <p className="font-medium">Inspection Only</p>
          <p className="text-muted-foreground mt-0.5 text-xs">A one-off CROSSUB inspector for this job. You keep management of the property.</p>
        </li>
        <li>
          <p className="font-medium">Full Service</p>
          <p className="text-muted-foreground mt-0.5 text-xs">CROSSUB takes on inspections, tenant communication and day-to-day work for the properties you choose.</p>
        </li>
      </ol>
    </div>
  );
}
