'use client';

import { Download, ExternalLink, FileText, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { JobCaseEmailAttachment } from '@/lib/job-case-email';
import { cn } from '@/lib/utils';

function withDownloadQuery(url: string): string {
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
}

export function EmailAttachmentList({
  attachments,
  title = 'Attachments',
  className,
}: {
  attachments: JobCaseEmailAttachment[];
  title?: string;
  className?: string;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn('rounded-xl border bg-muted/20 p-3 text-xs', className)}>
      <p className="mb-2 flex items-center gap-1.5 font-semibold">
        <Paperclip className="size-3.5" />
        {title}
      </p>
      <ul className="space-y-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.name}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-2.5 py-2"
          >
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
            {attachment.sizeLabel ? (
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {attachment.sizeLabel}
              </span>
            ) : null}
            {attachment.url ? (
              <div className="flex w-full shrink-0 gap-1 sm:ml-auto sm:w-auto">
                <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3" />
                    Preview
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                  <a href={withDownloadQuery(attachment.url)} download={attachment.name}>
                    <Download className="size-3" />
                    Download
                  </a>
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
