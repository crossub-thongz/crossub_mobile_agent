'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { QuoteRecommendation } from '@/components/agent/quote-recommendation-card';
import { ServiceRecommendation } from '@/components/agent/service-recommendation-card';
import { ROUTES } from '@/constants/routes';
import { useRecommendationPicture } from '@/hooks/use-recommendation-picture';
import { SERVICE_OFFER_KIND } from '@/lib/crossub-api/service-offer-client';
import { cn } from '@/lib/utils';

const SLIDE_MS = 8000;

function RecommendationSlideshow({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;
  const safe = index % count;
  if (count === 1) return <>{slides[0]}</>;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div>{slides[safe]}</div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
          aria-label="Previous suggestion"
          onClick={() => setIndex((current) => (current - 1 + count) % count)}
        >
          <ChevronLeft className="size-4" />
        </button>
        {slides.map((_, dot) => (
          <button
            key={dot}
            type="button"
            aria-label={`Suggestion ${dot + 1} of ${count}`}
            className={cn('size-2 rounded-full', dot === safe ? 'bg-[#067a56]' : 'bg-slate-300')}
            onClick={() => setIndex(dot)}
          />
        ))}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-md p-1"
          aria-label="Next suggestion"
          onClick={() => setIndex((current) => (current + 1) % count)}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Home shows one card, or both as a slideshow when inspection and quote offers qualify. */
export function HomeRecommendations({ cros = false }: { cros?: boolean }) {
  const { picture, ready } = useRecommendationPicture();
  if (!ready) return null;
  const kind = picture.recommendations?.kind;
  const slides: ReactNode[] = [];
  if (
    (kind === SERVICE_OFFER_KIND.INSPECTION && (picture.recommendations?.inspections ?? []).length > 0) ||
    (kind === SERVICE_OFFER_KIND.FULL_SERVICE && picture.recommendations?.home)
  ) {
    slides.push(<ServiceRecommendation key="service" surface={cros ? 'cros' : 'home'} />);
  }
  if ((picture.quotes ?? []).length > 0) {
    slides.push(<QuoteRecommendation key="quote" />);
  }
  return <RecommendationSlideshow slides={slides} />;
}

function taskId(pathname: string, section: string): string | undefined {
  const prefix = `${section}/`;
  if (!pathname.startsWith(prefix)) return undefined;
  const id = pathname.slice(prefix.length).split('/')[0];
  return id || undefined;
}

/** CROS shows the same suggestion as the page the agent is on. */
export function CrosPageRecommendation() {
  const pathname = usePathname();
  if (pathname === ROUTES.DASHBOARD) return <HomeRecommendations cros />;
  if (pathname === ROUTES.INSPECTIONS || pathname.startsWith(`${ROUTES.INSPECTIONS}/`)) {
    return <ServiceRecommendation surface="cros" />;
  }
  if (pathname === ROUTES.MAINTENANCE || pathname.startsWith(`${ROUTES.MAINTENANCE}/`)) {
    return <QuoteRecommendation requestId={taskId(pathname, ROUTES.MAINTENANCE)} />;
  }
  return null;
}
