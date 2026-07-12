'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Forward, Mail, Reply, Send } from 'lucide-react';
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
import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

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
  const from = email.from.toLowerCase();
  if (email.kind === 'job_created' && from.includes('tenant')) return 'inbound';
  if (email.kind === 'tenant_notice' || email.kind === 'timeline_email') return 'inbound';
  if (from.includes('research@') || from.includes('crossub')) return 'inbound';
  return 'outbound';
}

function emailPartyLine(email: JobCaseEmailRecord): string {
  const direction = emailDirection(email);
  const channel = email.channel === 'message' ? 'Message' : 'Email';
  const party = direction === 'inbound' ? `From ${email.from}` : `To ${email.to}`;
  return `${channel} · ${party}`;
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
        <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">{formatDate(email.at)}</p>
      </div>
      <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
    </button>
  );
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

function buildForwardDraft(email: JobCaseEmailRecord): CommSendDraft {
  const subject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
  return {
    subject,
    body:
      `\n\n---------- Forwarded message ----------\n` +
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

function EmailDetailDialog({
  email,
  open,
  onOpenChange,
  onSend,
}: {
  email: JobCaseEmailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (draft: CommSendDraft) => void;
}) {
  const [mode, setMode] = useState<CommComposeMode>('view');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const resetCompose = (nextMode: CommComposeMode, draft?: CommSendDraft) => {
    setMode(nextMode);
    if (draft) {
      setToEmail(draft.toEmail);
      setSubject(draft.subject);
      setBody(draft.body);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode('view');
      setToEmail('');
      setSubject('');
      setBody('');
    }
    onOpenChange(next);
  };

  if (!email) return null;

  const sendCompose = () => {
    if (!onSend) return;
    if (!toEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    onSend({
      subject: subject.trim(),
      body: body.trim(),
      to: toEmail.trim(),
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
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">From</dt>
                <dd className="font-medium">{email.from}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">To</dt>
                <dd className="font-medium">{email.to}</dd>
              </div>
            </dl>
            {email.attachments && email.attachments.length > 0 ? (
              <div className="rounded-xl border bg-muted/20 p-3 text-xs">
                <p className="mb-1 font-semibold">Attachments</p>
                <ul className="space-y-1">
                  {email.attachments.map((a) => (
                    <li key={a.name} className="text-muted-foreground">
                      {a.name}
                      {a.sizeLabel ? ` · ${a.sizeLabel}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="rounded-xl border bg-muted/20 p-3">
              <pre className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {email.body}
              </pre>
            </div>
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
                  onClick={() => resetCompose('forward', buildForwardDraft(email))}
                >
                  <Forward className="size-3.5" />
                  Forward
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="comm-to">To</Label>
              <Input
                id="comm-to"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
              />
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
}: {
  title?: string;
  emails: JobCaseEmailRecord[];
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...emails].sort((a, b) => b.at.localeCompare(a.at)),
    [emails],
  );
  const selected = sorted.find((email) => email.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          History
        </span>
      </div>

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

      <EmailDetailDialog
        email={selected}
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onSend={enableComposeActions ? onSend : undefined}
      />
    </div>
  );
}

export function JobCaseStageEmailHistory({
  emails,
  title,
  onSend,
  enableComposeActions,
}: {
  emails: JobCaseEmailRecord[];
  title?: string;
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
}) {
  return (
    <section className="border-t pt-4">
      <JobCaseEmailLog
        emails={emails}
        title={title}
        onSend={onSend}
        enableComposeActions={enableComposeActions}
      />
    </section>
  );
}
