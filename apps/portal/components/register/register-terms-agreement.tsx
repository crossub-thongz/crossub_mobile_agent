'use client';

import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import {
  REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
} from '@/lib/agent-registration';
import { api } from '@/lib/api';
import type { SystemAccessAgreementView } from '@/lib/system-access-agreement';
import { cn } from '@/lib/utils';

export function RegisterTermsAgreementCard({ className }: { className?: string }) {
  const [meta, setMeta] = useState<SystemAccessAgreementView | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<SystemAccessAgreementView>(REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo<DocumentPreviewItem>(
    () => ({
      title: meta?.title ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.title,
      fileName: meta?.fileName ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.fileName,
      downloadFileName: meta?.fileName ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.fileName,
      href: `/api${REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH}`,
    }),
    [meta],
  );

  const openPreview = () => setOpen(true);

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        aria-label="Open Terms and system access agreement"
        className={cn(
          'group mt-6 w-full rounded-lg border border-border/60 p-3 text-left text-xs text-muted-foreground transition-colors',
          'hover:border-primary/40 hover:bg-primary/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <p className="text-foreground text-sm font-medium underline underline-offset-2 group-hover:text-primary">
            Terms &amp; system access agreement
          </p>
          <ExternalLink className="text-primary size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="text-[11px] font-medium">Open to read</span>
        </div>
        <p className="mt-2">
          By registering you agree to the CROSSUB terms of service, privacy policy, and the
          CROSSUB Service Agreement (NSW). Tap here to open the document before you accept.
        </p>
      </button>

      <DocumentPreviewDialog
        doc={open ? preview : null}
        subtitle="CROSSUB Service Agreement (NSW)"
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
