'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildLandlordResearchEmailDraft,
  buildResearchReportHtml,
  resolveLandlordContact,
} from '@/lib/rent-review/research-landlord-email';
import {
  formatWorkflowEmailContact,
  type WorkflowEmailContact,
} from '@/lib/job-case-email-recipients';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewEmailToLandlordDialog({
  open,
  onOpenChange,
  detail,
  landlordName,
  landlordEmail,
  recipientContacts = [],
  onUpdated,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: RentReviewWorkflowDetail;
  landlordName?: string | null;
  landlordEmail?: string | null;
  recipientContacts?: WorkflowEmailContact[];
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  onSent?: () => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const contact = resolveLandlordContact(landlordName, landlordEmail);
  const [toEmail, setToEmail] = useState(contact.email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState(
    buildLandlordResearchEmailDraft(detail, contact.name, contact.email).attachments,
  );
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const draft = buildLandlordResearchEmailDraft(detail, contact.name, contact.email);
    setToEmail(draft.toEmail);
    setSubject(draft.subject);
    setBody(draft.body);
    setAttachments(draft.attachments);
  }, [open, detail, contact.name, contact.email]);

  useEffect(() => {
    if (!open || !detail.ai.suggestedWeekly) return;
    let active = true;
    setLoadingAttachments(true);
    void (async () => {
      try {
        const reportBlob = new Blob([buildResearchReportHtml(detail)], { type: 'text/html' });
        let fairTradingSize = '~85 KB';
        try {
          const noticeBlob = await rentReviewApi.downloadNoticeOfRentIncrease(detail.id, {
            weekly: detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
          });
          fairTradingSize = `${Math.max(1, Math.round(noticeBlob.size / 1024))} KB`;
        } catch {
          /* notice PDF optional at research stage */
        }
        if (!active) return;
        setAttachments([
          {
            name: 'CROSSUB-Rent-Review-Report.html',
            sizeLabel: `${Math.max(1, Math.round(reportBlob.size / 1024))} KB`,
          },
          { name: 'NSW-Fair-Trading-Notice.pdf', sizeLabel: fairTradingSize },
        ]);
      } finally {
        if (active) setLoadingAttachments(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, detail]);

  const send = async () => {
    if (!detail.propertyId) {
      toast.error('Property is required to send email');
      return;
    }
    if (!toEmail.trim()) {
      toast.error('Landlord email is required');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSending(true);
    try {
      const updated = await runMutation(
        detail.id,
        rentReviewApi.sendEmail(
          detail.id,
          {
            toEmail: toEmail.trim(),
            toName: contact.name,
            subject: subject.trim(),
            body: body.trim(),
            kind: 'landlord_research_email',
            channel: 'email',
          },
          detail.propertyId,
          detail.leaseEndDate,
        ),
      );
      onUpdated?.(updated);
      toast.success('Email sent to landlord');
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email to landlord</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {recipientContacts.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[11px] font-medium">Property contacts</p>
              <div className="flex flex-wrap gap-1.5">
                {recipientContacts.map((contact) => (
                  <button
                    key={`${contact.role}-${contact.email}`}
                    type="button"
                    onClick={() => setToEmail(contact.email)}
                    className="hover:bg-primary/10 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors"
                  >
                    {formatWorkflowEmailContact(contact)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="landlord-to">To</Label>
            <Input
              id="landlord-to"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="landlord@example.com"
            />
            <p className="text-muted-foreground text-[11px]">
              Auto-filled from the property landlord record. Edit if needed.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="landlord-subject">Subject</Label>
            <Input
              id="landlord-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="landlord-body">Message</Label>
              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                AI draft
              </span>
            </div>
            <Textarea
              id="landlord-body"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="text-sm leading-relaxed"
            />
            <p className="text-muted-foreground text-[11px]">
              Review and edit the AI-drafted message before sending.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Paperclip className="size-3.5" />
              Attachments
              {loadingAttachments ? (
                <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
              ) : null}
            </div>
            <ul className="space-y-1.5">
              {attachments.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-xs"
                >
                  <FileText className="text-primary size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                  {file.sizeLabel ? (
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {file.sizeLabel}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-[11px]">
              Includes the CROSSUB research report and NSW Fair Trading notice reference.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={send} disabled={sending || loadingAttachments}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
