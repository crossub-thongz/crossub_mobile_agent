'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Forward, Mail, Reply, Send } from 'lucide-react';
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
import type { JobCaseEmailAttachment, JobCaseEmailRecord } from '@/lib/job-case-email';
import type { WorkflowEmailContact } from '@/lib/job-case-email-recipients';
import {
  extractEmailAddress,
  formatEmailPartyWithRole,
  formatWorkflowEmailContact,
  formatWorkflowEmailContactBlock,
} from '@/lib/job-case-email-recipients';
import {
  attributeAgentOutboundEmails,
  isAgentOutboundEmail,
} from '@/lib/job-case-email-sender';
import { cn, formatDateTime } from '@/lib/utils';

export type CommComposeMode = 'view' | 'reply' | 'forward';

export interface CommSendDraft {
  subject: string;
  body: string;
  to: string;
  toEmail: string;
  mode: CommComposeMode;
  inReplyTo?: JobCaseEmailRecord;
}

function emailDirection(email: JobCaseEmailRecord): 'inbound' | 'outbound' {
  if (isAgentOutboundEmail(email)) return 'outbound';
  const from = email.from.toLowerCase();
  if (email.kind === 'job_created' && from.includes('tenant')) return 'inbound';
  if (
    email.kind === 'tenant_notice' ||
    email.kind === 'timeline_email' ||
    email.kind === 'inspector_accepted' ||
    email.kind === 'ingoing_report_distributed' ||
    email.kind === 'outgoing_report_distributed'
  ) {
    return 'inbound';
  }
  if (from.includes('(inspector)') || from.includes('research@') || from.includes('crossub')) {
    return 'inbound';
  }
  return 'outbound';
}

function emailPartyLine(email: JobCaseEmailRecord): string {
  const channel = email.channel === 'message' ? 'Message' : 'Email';
  return `${channel} · From ${email.from} · To ${email.to}`;
}

function EmailListRow({
  email,
  onSelect,
}: {
  email: JobCaseEmailRecord;
  onSelect: () => void;
}) {
  const direction = emailDirection(email);
  const Icon = direction === 'inbound' ? Reply : Mail;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="hover:bg-muted/30 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors"
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          direction === 'inbound' ? 'bg-sky-500/15 text-sky-700' : 'bg-amber-500/15 text-amber-700',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{email.subject}</p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{emailPartyLine(email)}</p>
        <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">{formatDateTime(email.at)}</p>
      </div>
      <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
    </button>
  );
}

function resolveEmailAttachments(
  email: JobCaseEmailRecord,
  allEmails: JobCaseEmailRecord[],
): JobCaseEmailAttachment[] {
  if (email.attachments?.length) return email.attachments;
  if (!email.inReplyToId) return [];

  const parent = allEmails.find((record) => record.id === email.inReplyToId);
  return parent?.attachments ?? [];
}

function EmailAttachmentListFromRecord({
  attachments,
}: {
  attachments: JobCaseEmailAttachment[];
}) {
  return <EmailAttachmentList attachments={attachments} />;
}

function buildReplyDraft(email: JobCaseEmailRecord): CommSendDraft {
  const replyTo = email.toEmail ?? email.from;
  const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
  return {
    subject,
    body: `\n\n---\nOn ${formatDateTime(email.at)}, ${email.from} wrote:\n${email.body}`,
    to: email.from,
    toEmail: replyTo.includes('@') ? replyTo : '',
    mode: 'reply',
    inReplyTo: email,
  };
}

function buildForwardDraft(
  email: JobCaseEmailRecord,
  contacts: WorkflowEmailContact[] = [],
): CommSendDraft {
  const subject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
  const contactBlock = formatWorkflowEmailContactBlock(contacts);
  return {
    subject,
    body:
      (contactBlock ? `${contactBlock}\n` : '') +
      `---------- Forwarded message ----------\n` +
      `From: ${email.from}\n` +
      `To: ${email.to}\n` +
      `Date: ${formatDateTime(email.at)}\n` +
      `Subject: ${email.subject}\n\n` +
      email.body,
    to: '',
    toEmail: '',
    mode: 'forward',
    inReplyTo: email,
  };
}

function RecipientPicker({
  contacts,
  onSelect,
}: {
  contacts: WorkflowEmailContact[];
  onSelect: (contact: WorkflowEmailContact) => void;
}) {
  if (contacts.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[11px] font-medium">Suggested recipients</p>
      <div className="flex flex-wrap gap-1.5">
        {contacts.map((contact) => (
          <button
            key={`${contact.role}-${contact.email}`}
            type="button"
            onClick={() => onSelect(contact)}
            className="hover:bg-primary/10 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors"
          >
            {formatWorkflowEmailContact(contact)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JobCaseEmailDetailDialog({
  email,
  allEmails,
  open,
  onOpenChange,
  onSend,
  recipientContacts = [],
}: {
  email: JobCaseEmailRecord | null;
  allEmails: JobCaseEmailRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (draft: CommSendDraft) => void;
  recipientContacts?: WorkflowEmailContact[];
}) {
  const [mode, setMode] = useState<CommComposeMode>('view');
  const [toEmail, setToEmail] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const resetCompose = (nextMode: CommComposeMode, draft?: CommSendDraft) => {
    setMode(nextMode);
    if (draft) {
      setToEmail(draft.toEmail);
      setToLabel(draft.to);
      setSubject(draft.subject);
      setBody(draft.body);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode('view');
      setToEmail('');
      setToLabel('');
      setSubject('');
      setBody('');
    }
    onOpenChange(next);
  };

  const applyRecipient = (contact: WorkflowEmailContact) => {
    setToEmail(contact.email);
    setToLabel(formatWorkflowEmailContact(contact));
  };

  if (!email) return null;

  const attachments = resolveEmailAttachments(email, allEmails);

  const sendCompose = () => {
    if (!onSend) return;
    if (!toEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    onSend({
      subject: subject.trim(),
      body: body.trim(),
      to: toLabel.trim() || toEmail.trim(),
      toEmail: toEmail.trim(),
      mode,
      inReplyTo: email,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent elevated className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-base leading-snug">
            {mode === 'view' ? email.subject : mode === 'reply' ? 'Reply' : 'Forward'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'view' ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">{formatDateTime(email.at)}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-1">
              <div>
                <dt className="text-muted-foreground">From</dt>
                <dd className="font-medium break-words">
                  {formatEmailPartyWithRole(
                    email.from,
                    email.fromEmail ?? extractEmailAddress(email.from),
                    recipientContacts,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">To</dt>
                <dd className="font-medium break-words">
                  {formatEmailPartyWithRole(email.to, email.toEmail, recipientContacts)}
                </dd>
              </div>
            </dl>
            <div className="rounded-xl border bg-muted/20 p-3">
              <pre className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {email.body}
              </pre>
            </div>
            <EmailAttachmentListFromRecord attachments={attachments} />
            {onSend ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => resetCompose('reply', buildReplyDraft(email))}
                >
                  <Reply className="size-3.5" />
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => resetCompose('forward', buildForwardDraft(email, recipientContacts))}
                >
                  <Forward className="size-3.5" />
                  Forward
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <RecipientPicker contacts={recipientContacts} onSelect={applyRecipient} />
            <div className="space-y-1">
              <Label htmlFor="comm-to">To</Label>
              <Input
                id="comm-to"
                type="email"
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  setToLabel(e.target.value);
                }}
                placeholder="name@example.com"
              />
              {toLabel && toLabel !== toEmail ? (
                <p className="text-muted-foreground text-[11px]">{toLabel}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="comm-subject">Subject</Label>
              <Input
                id="comm-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="comm-body">Message</Label>
              <Textarea
                id="comm-body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 px-0 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setMode('view')}>
                Back
              </Button>
              <Button type="button" className="gap-1.5" onClick={sendCompose}>
                <Send className="size-3.5" />
                Send
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function JobCaseEmailLog({
  title = 'E-mail',
  emails,
  onSend,
  enableComposeActions = false,
  recipientContacts = [],
  hideHeader = false,
}: {
  title?: string;
  emails: JobCaseEmailRecord[];
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
  recipientContacts?: WorkflowEmailContact[];
  hideHeader?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = useMemo(
    () =>
      attributeAgentOutboundEmails([...emails]).sort((a, b) => b.at.localeCompare(a.at)),
    [emails],
  );
  const selected = sorted.find((email) => email.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="text-primary size-4" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            History
          </span>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
          No email or message records yet for this stage.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y">
            {sorted.map((email) => (
              <li key={email.id}>
                <EmailListRow email={email} onSelect={() => setSelectedId(email.id)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <JobCaseEmailDetailDialog
        email={selected}
        allEmails={sorted}
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onSend={enableComposeActions ? onSend : undefined}
        recipientContacts={recipientContacts}
      />
    </div>
  );
}

/** Compact sent-email row that opens the same read-only detail dialog as email history. */
export function JobCaseSentEmailPreviewCard({
  title,
  record,
}: {
  title: string;
  record: JobCaseEmailRecord;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-muted/40 w-full rounded-xl border bg-muted/20 p-3 text-left text-xs transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
            <Mail className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground mt-0.5 truncate">
              To: {record.to} · {formatDateTime(record.at)}
            </p>
            {record.subject ? (
              <p className="text-muted-foreground mt-1 truncate">{record.subject}</p>
            ) : null}
          </div>
          <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
        </div>
      </button>
      <JobCaseEmailDetailDialog
        email={record}
        allEmails={[record]}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function JobCaseStageEmailHistory({
  emails,
  title = 'Email/message history',
  onSend,
  enableComposeActions,
  recipientContacts,
  collapsible = true,
  defaultOpen = false,
}: {
  emails: JobCaseEmailRecord[];
  title?: string;
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
  recipientContacts?: WorkflowEmailContact[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Keep collapsed when switching steps / reopening a case popup.
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, title]);
  const attributedEmails = useMemo(
    () => attributeAgentOutboundEmails(emails),
    [emails],
  );
  const emailCount = attributedEmails.length;

  if (!collapsible) {
    return (
      <section className="border-t pt-4">
        <JobCaseEmailLog
          emails={attributedEmails}
          title={title}
          onSend={onSend}
          enableComposeActions={enableComposeActions}
          recipientContacts={recipientContacts}
        />
      </section>
    );
  }

  return (
    <section className="border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <Mail className="text-primary size-4 shrink-0" />
        <span className="min-w-0 flex-1 text-sm font-semibold">{title}</span>
        {!open ? (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums">
            {emailCount} {emailCount === 1 ? 'email' : 'emails'}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="mt-3">
          <JobCaseEmailLog
            emails={attributedEmails}
            onSend={onSend}
            enableComposeActions={enableComposeActions}
            recipientContacts={recipientContacts}
            hideHeader
          />
        </div>
      ) : null}
    </section>
  );
}
