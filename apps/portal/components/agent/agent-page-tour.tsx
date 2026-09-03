'use client';

import { BookOpen } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import {
  AGENT_PAGE_TOURS,
  tourHref,
  type AgentTourStep,
} from '@/constants/agent-page-tour';
import type { AgentTutorialModuleId } from '@/constants/agent-module-tutorial';
import { findTourTarget, startAgentPageTour } from '@/lib/agent-page-tour';
import { cn } from '@/lib/utils';

const PAD = 8;

function measureTarget(id: string | undefined): DOMRect | null {
  if (!id) return null;
  const node = findTourTarget(id);
  if (!node) return null;
  node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  return node.getBoundingClientRect();
}

function tooltipStyle(rect: DOMRect | null): CSSProperties {
  const width = Math.min(360, window.innerWidth - 24);
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      width,
      transform: 'translate(-50%, -50%)',
    };
  }

  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow > 200 || rect.top < 140;
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 12,
  );

  if (placeBelow) {
    return { top: Math.min(window.innerHeight - 220, rect.bottom + 12), left, width };
  }
  return { bottom: Math.max(12, window.innerHeight - rect.top + 12), left, width };
}

export function AgentPageTourOverlay({
  steps,
  onClose,
}: {
  steps: AgentTourStep[];
  onClose: (status: 'completed' | 'skipped') => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const playable = useMemo(
    () =>
      steps.filter((step) => {
        if (!step.target) return true;
        if (!ready) return false;
        return Boolean(findTourTarget(step.target));
      }),
    [ready, steps],
  );
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = playable[Math.min(index, Math.max(playable.length - 1, 0))];

  const syncRect = useCallback(() => {
    if (!step) return;
    setRect(measureTarget(step.target));
  }, [step]);

  useEffect(() => {
    syncRect();
    const timer = window.setTimeout(syncRect, 280);
    window.addEventListener('resize', syncRect);
    window.addEventListener('scroll', syncRect, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', syncRect);
      window.removeEventListener('scroll', syncRect, true);
    };
  }, [syncRect, index]);

  if (!ready) return null;

  const last = index >= playable.length - 1;
  const highlight = step?.target ? rect : null;

  if (!step || playable.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={step.title}>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        aria-label="Dismiss tutorial"
        onClick={() => onClose('skipped')}
      />
      {highlight ? (
        <div
          className="pointer-events-none fixed z-[1] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{
            top: highlight.top - PAD,
            left: highlight.left - PAD,
            width: highlight.width + PAD * 2,
            height: highlight.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
          }}
        />
      ) : null}

      <div
        className="bg-background pointer-events-auto fixed z-[2] rounded-2xl border p-4 shadow-2xl"
        style={tooltipStyle(highlight)}
      >
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {index + 1} of {playable.length}
        </p>
        <p className="mt-1 text-base font-semibold">{step.title}</p>
        <p className="text-muted-foreground mt-1.5 max-h-[36vh] overflow-y-auto text-sm leading-relaxed">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {index === 0 ? (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => onClose('skipped')}>
              Skip
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setIndex((value) => Math.max(0, value - 1))}>
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              if (last) onClose('completed');
              else setIndex((value) => value + 1);
            }}
          >
            {last ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AgentHowToUseLink({
  module,
  className,
}: {
  module?: AgentTutorialModuleId;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (module) {
          const onPage =
            (module === 'properties' && pathname.startsWith('/properties')) ||
            (module === 'tasks' && pathname.startsWith('/tasks')) ||
            (module === 'history' && pathname.startsWith('/archive'));
          if (!onPage) {
            router.push(tourHref(module));
            return;
          }
        }
        startAgentPageTour();
      }}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60',
        className,
      )}
    >
      <BookOpen className="size-4" />
      How to use
    </button>
  );
}
