'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export function CaseDetailDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'default',
  headerActions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  size?: 'default' | 'wide' | 'xl' | '2xl';
  headerActions?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const desktopSizeClass =
    size === '2xl'
      ? 'md:max-h-[92vh] md:max-w-[min(96vw,72rem)]'
      : size === 'xl'
        ? 'md:max-h-[92vh] md:max-w-[min(96vw,56rem)]'
        : size === 'wide'
          ? 'md:max-h-[88vh] md:max-w-3xl'
          : 'md:max-h-[85vh] md:max-w-lg';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-background flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden border shadow-2xl',
          'rounded-t-2xl md:h-auto md:rounded-2xl',
          desktopSizeClass,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-detail-dialog-title"
      >
        <div
          className="bg-muted/80 mx-auto mt-2 h-1 w-10 shrink-0 rounded-full md:hidden"
          aria-hidden
        />

        <div className="border-border bg-background/95 sticky top-0 z-10 shrink-0 border-b backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3">
            <div className="min-w-0 flex-1">
              <h2 id="case-detail-dialog-title" className="text-base font-semibold md:text-sm">
                {title}
              </h2>
              {subtitle ? (
                <div className="text-muted-foreground mt-0.5 text-xs leading-snug">{subtitle}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:bg-secondary flex size-9 shrink-0 items-center justify-center rounded-lg md:size-8"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
