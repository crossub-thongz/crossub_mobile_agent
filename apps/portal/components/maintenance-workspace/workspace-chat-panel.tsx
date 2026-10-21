'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, Mail, MessageSquareText, Send } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { AgentInputFeedbackAnchor } from '@/components/ui/agent-input-feedback';
import { Input } from '@/components/ui/input';
import {
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  MAINTENANCE_CASE_EMAIL_INTENT,
  MAINTENANCE_EMAIL_RECIPIENT,
  MAINTENANCE_EMAIL_RECIPIENT_LABEL,
  type MaintenanceEmailRecipient,
} from '@/constants/self-managed-maintenance';
import { bindSanitizedTextValue } from '@/lib/strip-emojis';
import { sendMaintenanceCaseEmail } from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAuditLogEntry } from '@/lib/crossub-api/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import {
  isRawCaseId,
  replaceRawCaseIdWithLabel,
  workflowCaseReferenceLabel,
} from '@/lib/workflow-case-reference';
import { cn, formatDateTime } from '@/lib/utils';

type ChatMessage = {
  id: string;
  who: string;
  text: string;
  atIso: string;
  channel: 'in_app' | 'email';
  direction: 'inbound' | 'outbound' | 'system';
};

function recipientLabel(responsibility?: MaintenanceWorkspaceCase['responsibility']) {
  if (responsibility === 'tenant') return 'Tenant';
  if (responsibility === 'landlord') return 'Landlord';
  if (responsibility === 'strata') return 'Strata';
  return 'Recipient';
}

function seedFromNotifications(
  notifications: MaintenanceWorkspaceCase['notifications'],
  responsibility?: MaintenanceWorkspaceCase['responsibility'],
): ChatMessage[] {
  const seeded: ChatMessage[] = [];

  for (const n of notifications) {
    if (n.channel === 'in_app') {
      seeded.push({
        id: `seed-inapp-${n.id}`,
        who: 'System',
        text: `${n.title ? `${n.title}\n` : ''}${n.message}`.trim(),
        atIso: n.createdAt,
        channel: 'in_app',
        direction: 'system',
      });
      continue;
    }

    if (n.channel === 'email') {
      seeded.push({
        id: `seed-email-${n.id}`,
        who: 'System',
        text: `Email sent to ${recipientLabel(responsibility)}\nSubject: ${n.title}\n\n${n.message}`.trim(),
        atIso: n.createdAt,
        channel: 'email',
        direction: 'system',
      });
    }
  }

  return seeded;
}

function seedFromAudit(auditEntries: ApiMaintenanceAuditLogEntry[]): ChatMessage[] {
  const seeded: ChatMessage[] = [];

  for (const entry of auditEntries) {
    const msg = entry.message ?? '';
    const isEmail =
      entry.action === 'sla_reminder_generated' ||
      entry.action === 'responsibility_set' ||
      msg.toLowerCase().includes('email sent') ||
      msg.startsWith('Review email sent');

    if (!isEmail) continue;

    seeded.push({
      id: `seed-audit-${entry.id}`,
      who: entry.actor === 'agent' ? 'Agent' : entry.actor === 'admin' ? 'CROSSUB' : 'System',
      text: msg,
      atIso: entry.timestamp,
      channel: 'email',
      direction: 'system',
    });
  }

  return seeded;
}

function mergeMessages(existing: ChatMessage[], seeds: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const msg of [...seeds, ...existing]) {
    byId.set(msg.id, msg);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.atIso).getTime() - new Date(b.atIso).getTime(),
  );
}

function displayCaseRef(
  workspaceCase: MaintenanceWorkspaceCase,
  reference?: string,
): string {
  const preferred = reference?.trim();
  if (preferred && !isRawCaseId(preferred)) return preferred;
  const ref = workspaceCase.caseRef?.trim();
  if (ref && !isRawCaseId(ref)) return ref;
  return workflowCaseReferenceLabel(workspaceCase.id, 'maintenance');
}

function withTaskNumber(text: string, caseId: string, caseRef: string): string {
  return replaceRawCaseIdWithLabel(text, caseId, caseRef);
}

/** The parties this job holds an address for, in the order the picker offers them. */
function emailRecipientsFor(
  workspaceCase: MaintenanceWorkspaceCase,
  ownerEmailOnFile: boolean,
): MaintenanceEmailRecipient[] {
  const out: MaintenanceEmailRecipient[] = [];
  if (workspaceCase.tenant?.email?.trim()) out.push(MAINTENANCE_EMAIL_RECIPIENT.TENANT);
  if (workspaceCase.assignedContractorId || workspaceCase.invitedContractorIds?.length) {
    out.push(MAINTENANCE_EMAIL_RECIPIENT.CONTRACTOR);
  }
  if (workspaceCase.strataContact?.email?.trim() || workspaceCase.buildingManager?.email?.trim()) {
    out.push(MAINTENANCE_EMAIL_RECIPIENT.STRATA);
  }
  if (ownerEmailOnFile) out.push(MAINTENANCE_EMAIL_RECIPIENT.LANDLORD);
  return out;
}

function scrollListToLatest(el: HTMLElement | null) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/**
 * The job's message trail: in-app updates the tenant got, and the emails sent on the job.
 * On Self-Manage the agency writes the emails here (sent by the API and recorded on the job);
 * on other plans CROSSUB sends them, so the trail is read-only.
 */
export function WorkspaceChatPanel({
  workspaceCase,
  propertyId,
  reference,
  selfManaged = false,
  onSent,
}: {
  workspaceCase: MaintenanceWorkspaceCase;
  /** The job's property — its owner can be emailed on Self-Manage when an address is on file. */
  propertyId?: string | null;
  /** Preferred task number (order no. / tracking no.) shown in the header. */
  reference?: string;
  selfManaged?: boolean;
  /** Reload the job after an email is sent, so it shows in the trail. */
  onSent?: () => void | Promise<void>;
}) {
  const id = useId();
  const [chatTab, setChatTab] = useState<'app' | 'email'>(selfManaged ? 'email' : 'app');
  const caseRef = displayCaseRef(workspaceCase, reference);
  const { properties } = useAgentData();
  const ownerEmailOnFile = Boolean(
    propertyId && properties.find((p) => p.id === propertyId)?.homeOwnerContact.email?.trim(),
  );
  const recipients = useMemo(
    () => emailRecipientsFor(workspaceCase, ownerEmailOnFile),
    [workspaceCase, ownerEmailOnFile],
  );
  const [recipient, setRecipient] = useState<MaintenanceEmailRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRecipient = recipient && recipients.includes(recipient) ? recipient : recipients[0] ?? null;
  const defaultSubject = `${caseRef} · ${workspaceCase.issueType}`;

  const messages = useMemo(
    () =>
      mergeMessages(
        [],
        [
          ...seedFromNotifications(workspaceCase.notifications, workspaceCase.responsibility),
          ...seedFromAudit(workspaceCase.auditEntries),
        ],
      ).map((msg) => ({ ...msg, text: withTaskNumber(msg.text, workspaceCase.id, caseRef) })),
    [caseRef, workspaceCase],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollListToLatest(listRef.current);
      requestAnimationFrame(() => scrollListToLatest(listRef.current));
    });
    return () => cancelAnimationFrame(frame);
  }, [chatTab, messages]);

  const appMessages = useMemo(
    () => messages.filter((m) => m.channel === 'in_app'),
    [messages],
  );
  const emailMessages = useMemo(
    () => messages.filter((m) => m.channel === 'email'),
    [messages],
  );
  const visibleMessages = chatTab === 'app' ? appMessages : emailMessages;
  const canCompose = selfManaged && chatTab === 'email' && activeRecipient !== null;

  const sendEmail = async () => {
    const bodyText = draft.trim();
    if (!bodyText || !activeRecipient || sending) return;
    setSending(true);
    try {
      await sendMaintenanceCaseEmail(workspaceCase.id, {
        intent: MAINTENANCE_CASE_EMAIL_INTENT.REPLY,
        recipients: [{ role: activeRecipient }],
        subject: subject.trim() || defaultSubject,
        bodyText,
      });
      setDraft('');
      setSubject('');
      toast.success(COPY.emailSent);
      await onSent?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't send the email"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {caseRef} · {workspaceCase.issueType}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          {workspaceCase.address}
        </p>
      </div>

      <div className="border-border bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
        <div className="border-border flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <button
            type="button"
            onClick={() => setChatTab('app')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              chatTab === 'app'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
            )}
          >
            <MessageSquareText className="size-4" />
            App Messages
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px] font-semibold">
              {appMessages.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setChatTab('email')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              chatTab === 'email'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
            )}
          >
            <Mail className="size-4" />
            Email
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px] font-semibold">
              {emailMessages.length}
            </span>
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
          {visibleMessages.length === 0 ? (
            <div className="bg-muted/40 text-muted-foreground rounded-lg p-4 text-center text-xs">
              {chatTab === 'app'
                ? 'No in-app updates yet.'
                : 'No email messages yet. Sent emails will appear here.'}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleMessages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-3 py-2 text-xs',
                        isOutbound
                          ? 'bg-primary/10 text-foreground'
                          : 'bg-muted/50 text-foreground',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="font-semibold">{msg.who}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {formatDateTime(msg.atIso)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {withTaskNumber(msg.text, workspaceCase.id, caseRef)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-border border-t p-3 pt-3">
          {canCompose ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <label htmlFor={`${id}-to`} className="sr-only">
                  {COPY.emailRecipient}
                </label>
                <select
                  id={`${id}-to`}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  value={activeRecipient ?? ''}
                  disabled={sending}
                  onChange={(e) => setRecipient(e.target.value as MaintenanceEmailRecipient)}
                >
                  {recipients.map((role) => (
                    <option key={role} value={role}>
                      {COPY.emailRecipient}: {MAINTENANCE_EMAIL_RECIPIENT_LABEL[role]}
                    </option>
                  ))}
                </select>
                <label htmlFor={`${id}-subject`} className="sr-only">
                  {COPY.emailSubject}
                </label>
                <Input
                  id={`${id}-subject`}
                  value={subject}
                  placeholder={defaultSubject}
                  maxLength={200}
                  disabled={sending}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9 min-w-0 flex-1 text-sm"
                />
              </div>
              {activeRecipient === MAINTENANCE_EMAIL_RECIPIENT.LANDLORD ? (
                <p className="text-muted-foreground text-[11px]">{COPY.emailOwnerNote}</p>
              ) : null}
              <div className="flex items-end gap-2">
                <AgentInputFeedbackAnchor kind="message" value={draft} className="flex-1">
                  <textarea
                    value={draft}
                    aria-label={COPY.emailBody}
                    data-input-kind="message"
                    data-allow-emoji
                    maxLength={5000}
                    disabled={sending}
                    onChange={bindSanitizedTextValue({
                      kind: 'message',
                      allowEmoji: true,
                      onChange: (e) => setDraft(e.target.value),
                    })}
                    rows={3}
                    placeholder="Write an email…"
                    className="border-border focus:ring-primary/20 min-h-[44px] w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  />
                </AgentInputFeedbackAnchor>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5"
                  disabled={!draft.trim() || sending}
                  onClick={() => void sendEmail()}
                >
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  {COPY.emailSend}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {chatTab === 'app'
                ? COPY.appUpdatesNote
                : selfManaged
                  ? COPY.emailNoRecipient
                  : COPY.emailServiced}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
