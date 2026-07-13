'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Lightweight confirm/content shell for dialogs opened inside {@link CaseDetailDialog}.
 * Avoids nested Radix Dialog portals, which can throw removeChild errors when the
 * parent job-case shell re-renders during live sync.
 */
export function CaseNestedDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background grid w-full max-w-md gap-4 rounded-lg border p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-nested-dialog-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="case-nested-dialog-title" className="text-lg leading-none font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="text-muted-foreground mt-2 text-sm">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary flex size-8 shrink-0 items-center justify-center rounded-lg"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
