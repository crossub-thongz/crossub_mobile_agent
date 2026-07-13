'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { CaseNestedDialog } from '@/components/agent/case-nested-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { downloadOpenInspectionQr, openInspectionQrImageUrl } from '@/lib/open-inspection-qr';
import { resolveOpenInspectionApplyUrl } from '@/lib/tenant-app-url';

function parseRecipientEmails(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((part) => part.trim().toLowerCase())
        .filter((email) => email.length > 0 && email.includes('@')),
    ),
  ];
}

export function OpenInspectionApplyShareCard({
  session,
  compact,
}: {
  session: Pick<OpenInspectionSession, 'applyUrl' | 'propertyId' | 'id' | 'address' | 'property'>;
  compact?: boolean;
}) {
  const applyUrl = useMemo(() => resolveOpenInspectionApplyUrl(session), [session]);
  const [copied, setCopied] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [sending, setSending] = useState(false);
  const [savingQr, setSavingQr] = useState(false);

  if (!applyUrl) return null;

  const qrSrc = openInspectionQrImageUrl(applyUrl, compact ? 256 : 320);
  const qrFilename = `apply-qr-${session.id.slice(0, 8)}.png`;

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

  const saveQr = async () => {
    setSavingQr(true);
    try {
      await downloadOpenInspectionQr(applyUrl, qrFilename);
      toast.success('QR code saved');
    } catch {
      toast.error('Could not save QR code');
    } finally {
      setSavingQr(false);
    }
  };

  const sendLink = async () => {
    const emails = parseRecipientEmails(recipients);
    if (emails.length === 0) {
      toast.error('Enter at least one valid email address');
      return;
    }
    setSending(true);
    try {
      const result = await openViewingsApi.sendApplyLink(session.id, emails);
      toast.success(
        result.sent === 1
          ? 'Application link sent'
          : `Application link sent to ${result.sent} recipients`,
      );
      setRecipients('');
      setSendOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send application link');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Applicant link &amp; QR</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Share with prospects — they complete the rental application on the tenant app (
          {applyUrl.replace(/^https?:\/\//, '').split('/')[0]}).
        </p>
        <div
          className={`mt-3 flex gap-3 ${compact ? 'flex-col items-center' : 'flex-col sm:flex-row sm:items-start'}`}
        >
          <img
            src={qrSrc}
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSendOpen(true)}
              >
                <Mail className="size-3.5" />
                Send
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

      <CaseNestedDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send application link"
        description={
          <>
            Email the tenant-app apply link for {session.property || session.address}. Separate
            multiple addresses with commas or new lines.
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="apply-link-recipients">Recipient emails</Label>
          <Textarea
            id="apply-link-recipients"
            rows={4}
            placeholder="prospect1@email.com, prospect2@email.com"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            disabled={sending}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSendOpen(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void sendLink()} disabled={sending}>
            {sending ? 'Sending…' : 'Send link'}
          </Button>
        </div>
      </CaseNestedDialog>
    </>
  );
}
