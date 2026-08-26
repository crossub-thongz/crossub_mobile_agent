'use client';

import { Download, Eye, FileSignature } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isPdfDocument(url: string, fileName?: string | null): boolean {
  const hint = (fileName ?? url).toLowerCase();
  return hint.includes('.pdf');
}

export function LeasingAgreementSignedDocumentPanel({
  fileName,
  proofUrl,
  pending = false,
}: {
  fileName?: string | null;
  proofUrl?: string | null;
  pending?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasDocument = Boolean(proofUrl || fileName);
  const displayName = fileName ?? 'Signed agreement';
  const canPreview = Boolean(proofUrl);

  if (!hasDocument) return null;

  return (
    <>
      <div className="rounded-lg border border-border/60 bg-secondary/15 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
              <FileSignature className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium">Tenant signed document</p>
              <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{displayName}</p>
              {pending ? (
                <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  Pending your confirmation
                </p>
              ) : null}
            </div>
          </div>
          {canPreview ? (
            <div className="flex flex-wrap gap-1.5 sm:shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-3" />
                View signed
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-[11px]">
                <a
                  href={proofUrl ?? undefined}
                  download={fileName ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-3" />
                  Download
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {canPreview && proofUrl ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            elevated
            className="max-h-[90vh] w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl"
          >
            <DialogHeader className="border-border/60 border-b px-4 py-3">
              <DialogTitle className="truncate text-sm">{displayName}</DialogTitle>
            </DialogHeader>
            <div className="bg-muted/30 h-[min(75vh,720px)] overflow-hidden">
              {isPdfDocument(proofUrl, fileName) ? (
                <iframe title={displayName} src={proofUrl} className="h-full w-full bg-white" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded proof URL
                <img
                  src={proofUrl}
                  alt={displayName}
                  className="mx-auto max-h-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/** Grouped action row for agreement step footers. */
export function LeasingAgreementActionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
