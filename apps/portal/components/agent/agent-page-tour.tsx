'use client';

import { BookOpen, CircleAlert, Headphones, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import {
  AGENT_PAGE_TOURS,
  AGENT_TOUR_ACCOUNT_MANAGER_NOTE,
  tourHref,
  type AgentTourStep,
} from '@/constants/agent-page-tour';
import type { AgentTutorialModuleId } from '@/constants/agent-module-tutorial';
import { findTourTarget, startAgentPageTour } from '@/lib/agent-page-tour';
import {
  focusWorkflowTourTab,
  shouldFocusWorkflowTourTab,
} from '@/lib/workflow-tour-tab-focus';
import {
  requestWorkflowTourOpenCreateMenu,
  shouldOpenWorkflowTourCreateMenu,
} from '@/lib/agent-workflow-tour';
import { cn } from '@/lib/utils';

const PAD = 8;
const VIEW_MARGIN = 12;
const GAP = 12;
const TOUR_OVERLAY_COLOR = 'rgba(15, 23, 42, 0.58)';

function measureTarget(id: string | undefined): DOMRect | null {
  if (!id) return null;
  const node = findTourTarget(id);
  if (!node) return null;
  const large = node.getBoundingClientRect().height > window.innerHeight * 0.55;
  node.scrollIntoView({
    block: large ? 'start' : 'center',
    inline: 'nearest',
    behavior: 'smooth',
  });
  return node.getBoundingClientRect();
}

function visibleRect(rect: DOMRect): DOMRect {
  const top = Math.max(rect.top, VIEW_MARGIN);
  const left = Math.max(rect.left, VIEW_MARGIN);
  const right = Math.min(rect.right, window.innerWidth - VIEW_MARGIN);
  const bottom = Math.min(rect.bottom, window.innerHeight - VIEW_MARGIN);
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

function tooltipPosition(
  rect: DOMRect | null,
  tooltipWidth: number,
  tooltipHeight: number,
): CSSProperties {
  const maxWidth = Math.min(360, window.innerWidth - VIEW_MARGIN * 2);
  const width = Math.min(tooltipWidth || maxWidth, maxWidth);
  const maxHeight = window.innerHeight - VIEW_MARGIN * 2;
  const height = Math.min(tooltipHeight || 220, maxHeight);

  if (!rect) {
    return {
      top: Math.max(VIEW_MARGIN, (window.innerHeight - height) / 2),
      left: Math.max(VIEW_MARGIN, (window.innerWidth - width) / 2),
      width,
      maxHeight,
    };
  }

  const visible = visibleRect(rect);
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  let top: number;
  let left = visible.left + visible.width / 2 - width / 2;

  if (visible.height > viewportH * 0.45) {
    const roomBelow = viewportH - visible.bottom - VIEW_MARGIN;
    top =
      roomBelow >= height + GAP
        ? visible.bottom + GAP
        : viewportH - height - VIEW_MARGIN;
  } else {
    const spaceBelow = viewportH - VIEW_MARGIN - visible.bottom;
    const spaceAbove = visible.top - VIEW_MARGIN;
    top =
      spaceBelow >= height + GAP || spaceBelow >= spaceAbove
        ? visible.bottom + GAP
        : visible.top - GAP - height;
  }

  top = Math.min(Math.max(top, VIEW_MARGIN), viewportH - height - VIEW_MARGIN);
  left = Math.min(Math.max(left, VIEW_MARGIN), viewportW - width - VIEW_MARGIN);

  return { top, left, width, maxHeight };
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
        return ready;
      }),
    [ready, steps],
  );
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tipBox, setTipBox] = useState({ width: 360, height: 220 });

  const step = playable[Math.min(index, Math.max(playable.length - 1, 0))];
  const highlight = step?.target ? rect : null;
  const spotlight = highlight ? visibleRect(highlight) : null;

  const syncRect = useCallback(() => {
    if (!step) return;
    setRect(measureTarget(step.target));
  }, [step]);

  useEffect(() => {
    if (step && shouldFocusWorkflowTourTab(step.target)) {
      focusWorkflowTourTab();
    }
    if (step && shouldOpenWorkflowTourCreateMenu(step.target)) {
      requestWorkflowTourOpenCreateMenu();
    }
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

  useEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const update = () => {
      setTipBox({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [step, index, ready]);

  if (!ready) return null;
  if (!step || playable.length === 0) return null;

  const last = index >= playable.length - 1;
  const tooltipStyle = tooltipPosition(spotlight, tipBox.width, tipBox.height);

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={step.title}>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        aria-label="Exit tutorial"
        onClick={() => onClose('skipped')}
      />
      {spotlight && spotlight.width > 0 && spotlight.height > 0 ? (
        <div
          className="pointer-events-none fixed z-[1] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{
            top: Math.max(4, spotlight.top - PAD),
            left: Math.max(4, spotlight.left - PAD),
            width: Math.min(spotlight.width + PAD * 2, window.innerWidth - 8),
            height: Math.min(spotlight.height + PAD * 2, window.innerHeight - 8),
            boxShadow: `0 0 0 9999px ${TOUR_OVERLAY_COLOR}`,
          }}
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ backgroundColor: TOUR_OVERLAY_COLOR }}
        />
      )}

      <div
        ref={tooltipRef}
        className="bg-background pointer-events-auto fixed z-[2] flex max-h-[calc(100dvh-24px)] flex-col rounded-2xl border p-4 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex shrink-0 items-start justify-between gap-2">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            {index + 1} of {playable.length}
          </p>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded-lg p-1 transition-colors hover:bg-muted/60"
            aria-label="Exit tutorial"
            onClick={() => onClose('skipped')}
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 shrink-0 text-base font-semibold">{step.title}</p>
        <p className="text-muted-foreground mt-1.5 min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed">
          {step.description}
        </p>
        {step.actionNote ? (
          <div className="border-rose-500/25 bg-rose-500/[0.06] mt-3 flex shrink-0 gap-2.5 rounded-xl border p-2.5">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
            <p className="text-xs leading-relaxed text-rose-950/90 dark:text-rose-100/90">
              <span className="font-semibold">Your action: </span>
              {step.actionNote}
            </p>
          </div>
        ) : null}
        <div className="border-primary/15 bg-primary/[0.04] mt-3 flex shrink-0 gap-2.5 rounded-xl border p-2.5">
          <Headphones className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-muted-foreground text-xs leading-relaxed">{AGENT_TOUR_ACCOUNT_MANAGER_NOTE}</p>
        </div>
        <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {index > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setIndex((value) => Math.max(0, value - 1))}>
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => onClose('skipped')}
            >
              Exit
            </Button>
          </div>
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
