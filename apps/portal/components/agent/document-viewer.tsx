'use client';

import { Download, ExternalLink, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
  const url = downloadUrl ?? '#';

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

      <div className="bg-secondary/50 flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <FileText className="text-muted-foreground mb-2 size-10" />
        <p className="text-muted-foreground text-sm">Document preview</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-xs">
          PDF viewer placeholder — connects to crossub_web document storage when
          backend is ready.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Open
          </a>
        </Button>
        <Button className="flex-1" asChild>
          <a href={url} download>
            <Download className="size-4" />
            Download
          </a>
        </Button>
        {onClose && (
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
