'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';

function qrImageUrl(applyUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(applyUrl)}`;
}

export function OpenInspectionApplyShareCard({
  session,
  compact,
}: {
  session: Pick<OpenInspectionSession, 'applyUrl'>;
  compact?: boolean;
}) {
  const applyUrl = session.applyUrl;
  const [copied, setCopied] = useState(false);

  if (!applyUrl) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(applyUrl);
      setCopied(true);
      toast.success('Application link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Applicant link &amp; QR</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Share with prospects — they complete the same rental application as the tenant app.
      </p>
      <div className={`mt-3 flex gap-3 ${compact ? 'flex-col items-center' : 'flex-col sm:flex-row sm:items-start'}`}>
        <img
          src={qrImageUrl(applyUrl)}
          alt="Application QR code"
          width={128}
          height={128}
          className="rounded-lg border bg-white p-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-[10px]">
            {applyUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void copyLink()}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
              <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Open form
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
