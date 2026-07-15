'use client';

import { useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { downloadOpenInspectionQr, openInspectionQrImageUrl } from '@/lib/open-inspection-qr';

export function OpenInspectionLinkQrBlock({
  title,
  description,
  url,
  qrFilename,
  compact,
}: {
  title: string;
  description: string;
  url: string;
  qrFilename: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const qrSrc = openInspectionQrImageUrl(url, compact ? 200 : 256);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const saveQr = async () => {
    setSavingQr(true);
    try {
      await downloadOpenInspectionQr(url, qrFilename);
      toast.success('QR code saved');
    } catch {
      toast.error('Could not save QR code');
    } finally {
      setSavingQr(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
      <div className={`mt-3 flex gap-3 ${compact ? 'flex-col items-center' : 'flex-col sm:flex-row sm:items-start'}`}>
        <img
          src={qrSrc}
          alt={`${title} QR code`}
          width={112}
          height={112}
          className="rounded-lg border bg-white p-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-[10px]">
            {url}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void copyLink()}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={savingQr}
              onClick={() => void saveQr()}
            >
              <Download className="size-3.5" />
              {savingQr ? 'Saving…' : 'Save QR'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
