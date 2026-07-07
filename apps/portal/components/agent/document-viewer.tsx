'use client';

import { Download, ExternalLink, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  documentPreviewKind,
  isViewableDocumentUrl,
} from '@/lib/document-preview';

export function DocumentViewer({
  title,
  propertyAddress,
  category,
  downloadUrl,
  onClose,
}: {
  title: string;
  propertyAddress: string;
  category: string;
  downloadUrl?: string;
  onClose?: () => void;
}) {
  const url = isViewableDocumentUrl(downloadUrl) ? downloadUrl : undefined;
  const previewKind = url ? documentPreviewKind(url) : 'none';

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileText className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">{propertyAddress}</p>
          <p className="text-muted-foreground mt-1 text-[11px] capitalize">
            {category.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="bg-secondary/50 overflow-hidden rounded-lg border border-dashed">
        {!url ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <FileText className="text-muted-foreground mb-2 size-10" />
            <p className="text-muted-foreground text-sm">No preview available</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs">
              This document has no file attached yet. Upload it from Reports &amp; Documents or
              complete the Transfer IN checklist.
            </p>
          </div>
        ) : previewKind === 'image' ? (
          <div className="flex min-h-[240px] items-center justify-center bg-black/5 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={title}
              className="max-h-[min(60vh,480px)] w-full object-contain"
            />
          </div>
        ) : previewKind === 'pdf' ? (
          <iframe
            title={title}
            src={url}
            className="min-h-[min(60vh,480px)] w-full border-0 bg-background"
          />
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <FileText className="text-muted-foreground mb-2 size-10" />
            <p className="text-muted-foreground text-sm">Preview not supported for this file type</p>
            <p className="text-muted-foreground mt-1 text-xs">Use Open or Download below.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {url ? (
          <>
            <Button variant="outline" className="flex-1" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Open
              </a>
            </Button>
            <Button className="flex-1" asChild>
              <a href={url} download={title}>
                <Download className="size-4" />
                Download
              </a>
            </Button>
          </>
        ) : null}
        {onClose && (
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
