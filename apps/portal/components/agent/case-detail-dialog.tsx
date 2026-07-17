'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

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
  if (!open) return null;

  const sizeClass =
    size === '2xl'
      ? 'max-h-[92vh] max-w-[min(96vw,72rem)]'
      : size === 'xl'
        ? 'max-h-[92vh] max-w-[min(96vw,56rem)]'
        : size === 'wide'
          ? 'max-h-[88vh] max-w-3xl'
          : 'max-h-[85vh] max-w-lg';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-background flex w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {subtitle ? (
              <p className="truncate text-xs">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
