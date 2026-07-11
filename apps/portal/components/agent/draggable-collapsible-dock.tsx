'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { GripVertical, X } from 'lucide-react';

import { cn } from '@/lib/utils';

const DRAG_THRESHOLD_PX = 8;
const STORAGE_KEY = 'crossub.agent-dock.position';

type DockCornerPosition = {
  kind: 'corner';
  right: number;
  bottom: number;
};

type DockFreePosition = {
  kind: 'free';
  left: number;
  top: number;
};

type DockPosition = DockCornerPosition | DockFreePosition;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadPosition(defaultCorner: DockCornerPosition): DockPosition {
  if (typeof window === 'undefined') return defaultCorner;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCorner;
    const parsed = JSON.parse(raw) as DockPosition;
    if (parsed.kind === 'corner' || parsed.kind === 'free') return parsed;
  } catch {
    /* ignore */
  }
  return defaultCorner;
}

function positionStyle(position: DockPosition): CSSProperties {
  if (position.kind === 'corner') {
    return { right: position.right, bottom: position.bottom, left: 'auto', top: 'auto' };
  }
  return { left: position.left, top: position.top, right: 'auto', bottom: 'auto' };
}

export function DraggableCollapsibleDock({
  defaultCorner,
  className,
  launcherLabel = 'Quick actions',
  children,
}: {
  defaultCorner: DockCornerPosition;
  className?: string;
  launcherLabel?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<DockPosition>(() => loadPosition(defaultCorner));
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: DockPosition;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      /* ignore */
    }
  }, [position]);

  const onLauncherPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: position,
        dragging: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position],
  );

  const onLauncherPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    drag.dragging = true;
    const margin = 12;
    const width = 56;
    const height = 56;

    if (drag.origin.kind === 'corner') {
      const left = window.innerWidth - drag.origin.right - width + dx;
      const top = window.innerHeight - drag.origin.bottom - height + dy;
      setPosition({
        kind: 'free',
        left: clamp(left, margin, window.innerWidth - width - margin),
        top: clamp(top, margin, window.innerHeight - height - margin),
      });
      return;
    }

    setPosition({
      kind: 'free',
      left: clamp(drag.origin.left + dx, margin, window.innerWidth - width - margin),
      top: clamp(drag.origin.top + dy, margin, window.innerHeight - height - margin),
    });
  }, []);

  const onLauncherPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag.dragging) {
      setExpanded((open) => !open);
    }
  }, []);

  return (
    <div
      className={cn('pointer-events-none fixed z-50 flex flex-col items-end gap-2', className)}
      style={positionStyle(position)}
    >
      {expanded ? (
        <div className="pointer-events-auto flex flex-col items-end gap-2">{children}</div>
      ) : null}

      <button
        type="button"
        title={expanded ? 'Close quick actions' : launcherLabel}
        aria-label={expanded ? 'Close quick actions' : launcherLabel}
        aria-expanded={expanded}
        onPointerDown={onLauncherPointerDown}
        onPointerMove={onLauncherPointerMove}
        onPointerUp={onLauncherPointerUp}
        onPointerCancel={onLauncherPointerUp}
        className={cn(
          'pointer-events-auto flex size-12 cursor-grab items-center justify-center rounded-full border bg-card/95 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors active:cursor-grabbing',
          expanded
            ? 'border-border/70 text-muted-foreground hover:text-foreground'
            : 'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        {expanded ? <X className="size-5" /> : <GripVertical className="size-5" />}
      </button>
    </div>
  );
}
