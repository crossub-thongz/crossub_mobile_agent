'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { EmailAttachmentList } from '@/components/agent/email-attachment-list';
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
  defaultResearchAttachments,
  researchPackDraftAttachmentUrls,
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
  const seededForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      seededForOpenRef.current = false;
      return;
    }
    if (seededForOpenRef.current) return;
    seededForOpenRef.current = true;

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
        let leaseAgreementSize = '~200 KB';
        try {
          const leaseBlob = await rentReviewApi.downloadNoticeOfRentIncrease(detail.id, {
            weekly: detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
          });
          leaseAgreementSize = `${Math.max(1, Math.round(leaseBlob.size / 1024))} KB`;
        } catch {
          /* lease agreement PDF optional at research stage */
        }
        if (!active || !detail.propertyId) return;
        const urls = researchPackDraftAttachmentUrls(
          detail.propertyId,
          detail.id,
          detail.ai.suggestedWeekly ?? detail.currentWeeklyRent,
        );
        setAttachments(
          defaultResearchAttachments(detail.id).map((file) => ({
            ...file,
            sizeLabel:
              file.name === 'CROSSUB-Rent-Review-Report.html'
                ? `${Math.max(1, Math.round(reportBlob.size / 1024))} KB`
                : leaseAgreementSize,
            url: urls[file.name],
          })),
        );
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

          <EmailAttachmentList attachments={attachments} title="Attachments" />
          {loadingAttachments ? (
            <p className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <Loader2 className="size-3.5 animate-spin" />
              Loading attachment sizes…
            </p>
          ) : (
            <p className="text-muted-foreground text-[11px]">
              Includes the CROSSUB research report and NSW Fair Trading notice reference.
            </p>
          )}
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
