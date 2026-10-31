'use client';

import Link from 'next/link';
import { Building2, CalendarClock, ClipboardCheck, Clock3, Sparkles, X } from 'lucide-react';

import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { INSPECTION_CROSSUB_QUERY, inspectionCrossubInspector, inspectionNew, ROUTES } from '@/constants/routes';
import { useRecommendationPicture } from '@/hooks/use-recommendation-picture';
import {
  dismissServiceOffer,
  notifyServiceOffersChanged,
  RECOMMENDATION_BUTTON,
  SERVICE_OFFER_KIND,
  snoozeServiceOffer,
  type RecommendationButton,
  type ServiceOfferInspection,
} from '@/lib/crossub-api/service-offer-client';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const SNOOZE_DAYS = 7;

type Surface = 'home' | 'inspections' | 'task' | 'cros';

function daysUntil(dueOn: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueOn}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function dueLabel(days: number): string {
  if (days < 0) {
    const count = Math.abs(days);
    return `Routine inspection is ${count} day${count === 1 ? '' : 's'} overdue and still not booked.`;
  }
  if (days === 0) return 'Routine inspection is due today and still not booked.';
  if (days === 1) return 'Routine inspection is due in 1 day.';
  return `Routine inspection is due in ${days} days.`;
}

function arrangeHref(offer: ServiceOfferInspection): string {
  if (offer.subjectType === 'INSPECTION') return inspectionCrossubInspector(offer.subjectId);
  // A routine that is not a case yet has no inspector step. Create it, then the new
  // page opens the same payment step an existing inspection uses.
  const params = new URLSearchParams();
  if (offer.propertyId) params.set('property', offer.propertyId);
  params.set('type', 'ROUTINE');
  params.set(INSPECTION_CROSSUB_QUERY, '1');
  return `${inspectionNew()}?${params.toString()}`;
}

/**
 * Self-Manage assistance card. Home, Inspections, the inspection task and CROS render only
 * what `GET /agent/service-recommendations` allows, and share its snooze and dismiss.
 */
export function ServiceRecommendation({
  surface,
  inspectionId,
  propertyId,
}: {
  surface: Surface;
  /** On an inspection task, only that job's offer is shown. */
  inspectionId?: string;
  /**
   * Passed for a task that has no visit date. An unarranged routine is keyed to the
   * schedule until a case exists, so the same property's offer is the one to show.
   */
  propertyId?: string;
}) {
  const { picture, ready } = useRecommendationPicture();
  const data = picture.recommendations;

  if (!ready || !data?.kind) return null;

  const inspections = [...(data.inspections ?? [])].sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const lead = inspectionId
    ? inspections.find((offer) => offer.subjectId === inspectionId) ??
      (propertyId ? inspections.find((offer) => offer.propertyId === propertyId) : undefined)
    : inspections[0];

  const snooze = async (offer: ServiceOfferInspection) => {
    await settleOffers([offer], snoozeServiceOffer);
  };
  const dismiss = async (offer: ServiceOfferInspection) => {
    await settleOffers([offer], dismissServiceOffer);
  };

  if (surface === 'cros') {
    return <CrosSuggestion buttons={data.cros?.buttons ?? []} inspections={inspections} />;
  }

  if (surface === 'home' && data.kind === SERVICE_OFFER_KIND.FULL_SERVICE && data.home) {
    return <FullServiceOffer buttons={data.home.buttons} />;
  }

  if (!lead) return null;
  return (
    <AssistanceCard
      offer={lead}
      emphasizeFull={false}
      onSnooze={() => void snooze(lead)}
      onDismiss={() => void dismiss(lead)}
    />
  );
}

async function settleOffers(
  offers: ServiceOfferInspection[],
  action: (offer: ServiceOfferInspection) => Promise<unknown>,
): Promise<void> {
  for (const offer of offers) {
    try {
      await action(offer);
    } catch (err) {
      console.error(apiErrorMessage(err));
    }
  }
  notifyServiceOffersChanged();
}

function hasButton(buttons: RecommendationButton[], button: RecommendationButton): boolean {
  return (buttons ?? []).includes(button);
}

function AssistanceCard({
  offer,
  emphasizeFull,
  onSnooze,
  onDismiss,
}: {
  offer: ServiceOfferInspection;
  emphasizeFull: boolean;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const showInspection = hasButton(offer.buttons, RECOMMENDATION_BUTTON.ARRANGE_INSPECTIONS);
  const showFull = hasButton(offer.buttons, RECOMMENDATION_BUTTON.EXPLORE_FULL_SERVICE);
  if (!showInspection && !showFull) return null;
  const inspectionFirst = !emphasizeFull || !showFull;
  const days = daysUntil(offer.dueOn);

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
        {dueLabel(days)} Choose how you&apos;d like to manage this property.
      </p>
      <div className={cn('mt-3 grid gap-2', showInspection && showFull ? 'sm:grid-cols-2' : '')}>
        {inspectionFirst ? (
          <>
            {showInspection ? <InspectionOnlyChoice href={arrangeHref(offer)} primary /> : null}
            {showFull ? <FullServiceChoice primary={emphasizeFull && !showInspection} /> : null}
          </>
        ) : (
          <>
            {showFull ? <FullServiceChoice primary /> : null}
            {showInspection ? <InspectionOnlyChoice href={arrangeHref(offer)} primary={false} /> : null}
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">You can always continue managing it yourself.</p>
        <SnoozeDismiss onSnooze={onSnooze} onDismiss={onDismiss} />
      </div>
      <WaysCrosHelps />
    </section>
  );
}

function FullServiceOffer({ buttons }: { buttons: RecommendationButton[] }) {
  if (!hasButton(buttons, RECOMMENDATION_BUTTON.EXPLORE_FULL_SERVICE)) return null;
  return (
    <section className="rounded-2xl border border-[#d7eee6] bg-white p-4 shadow-[0_9px_26px_rgba(26,89,70,0.04)]">
      <h2 className="text-lg font-semibold tracking-tight">Would you like Crossub to help?</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Several inspections are still unarranged. Full Service can take on inspections, tenant
        communication and daily work for the properties you choose.
      </p>
      <div className="mt-3">
        <FullServiceChoice primary />
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        Price, scope and start date are confirmed on the next page. This does not change the
        property&apos;s management.
      </p>
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
        href={ROUTES.FULL_SERVICE}
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

function SnoozeDismiss({ onSnooze, onDismiss }: { onSnooze: () => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onSnooze} className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
        <Clock3 className="size-3.5" />
        Remind me in {SNOOZE_DAYS} days
      </button>
      <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Not interested">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function CrosSuggestion({
  buttons,
  inspections,
}: {
  buttons: RecommendationButton[];
  inspections: ServiceOfferInspection[];
}) {
  const showArrange = hasButton(buttons, RECOMMENDATION_BUTTON.ARRANGE_INSPECTIONS);
  const showFull = hasButton(buttons, RECOMMENDATION_BUTTON.EXPLORE_FULL_SERVICE);
  if (!showArrange && !showFull) return null;
  const count = inspections.length;
  const lead = inspections[0];
  const these = count === 1 ? 'this' : 'these';

  return (
    <section className="rounded-2xl border border-[#d7eee6] bg-[#f7faf9] p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="size-4 text-[#067a56]" />
        {CROS_ASSISTANT_NAME}
        <span className="rounded-full bg-[#e7f8f2] px-2 py-0.5 text-[11px] font-semibold text-[#067a56]">
          Suggestion
        </span>
      </p>
      {count > 0 ? (
        <p className="mt-3 text-sm text-slate-800">
          You have {count} upcoming inspection{count === 1 ? '' : 's'} that {count === 1 ? "hasn't" : "haven't"} been arranged yet.
        </p>
      ) : null}
      <p className="text-muted-foreground mt-1 text-sm">{crosHelpCopy(showArrange, showFull, these)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {showArrange ? (
          <Link
            href={lead ? arrangeHref(lead) : ROUTES.INSPECTIONS}
            className={cn(
              'flex min-h-10 items-center justify-center rounded-lg bg-[#00bd85] px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[#00a876]',
              !showFull && 'col-span-2',
            )}
          >
            Arrange inspections
          </Link>
        ) : null}
        {showFull ? (
          <Link
            href={ROUTES.FULL_SERVICE}
            className={cn(
              'flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors',
              showArrange
                ? 'border border-[#ccece3] bg-white text-[#067a56] hover:border-[#00bd85] hover:bg-[#f3fbf8]'
                : 'col-span-2 bg-[#00bd85] text-white hover:bg-[#00a876]',
            )}
          >
            Explore Full Service
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function crosHelpCopy(arrange: boolean, full: boolean, these: 'this' | 'these'): string {
  if (arrange && full) {
    return `I can help you arrange ${these} through Crossub's Inspection Only service, or you can explore Full Service if you'd prefer ongoing management support.`;
  }
  if (arrange) {
    return `I can help you arrange ${these} through Crossub's Inspection Only service.`;
  }
  return "You can explore Full Service if you'd prefer ongoing management support.";
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
          <p className="text-muted-foreground mt-1 text-xs">
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
