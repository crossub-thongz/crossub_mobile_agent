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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'default' | 'wide';
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-background flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          size === 'wide' ? 'max-w-2xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {subtitle ? (
              <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
