'use client';

import { Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ConversationPropertyOption } from '@/components/agent/conversations/conversation-list';
import { AttachControl, AttachmentChips, RecipientRow } from '@/components/agent/conversations/reply-composer-parts';
import { FilterChips } from '@/components/agent/filter-chips';
import { FieldLabel, SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CONVERSATION_ACTION,
  CONVERSATION_APP_NAME,
  CONVERSATION_APP_RECIPIENTS,
  CONVERSATION_ATTACHMENT_LIMITS,
  CONVERSATION_CHANNEL_OPTIONS,
  CONVERSATION_DELIVERY_SENT,
  CONVERSATION_RECIPIENT,
  CONVERSATION_RECIPIENT_OPTIONS,
  CONVERSATION_RECIPIENTS_REQUIRING_EMAIL,
  CONVERSATION_REPLY_CHANNEL,
  CONVERSATION_SELECT_PROMPT_VALUE,
  CONVERSATIONS_COPY,
  type ConversationRecipient,
  type ConversationReplyChannel,
} from '@/constants/conversations';
import { useConversationAction } from '@/hooks/use-agent-conversations';
import {
  createAgentConversation,
  replyToAgentConversation,
  type AgentConversationAttachmentUpload,
  type AgentConversationDetail,
  type AgentConversationTemplate,
} from '@/lib/crossub-api/agent-conversation-client';
import { emailsOfHouseholdTenants } from '@/lib/property-parties';
import { useHouseholdTenants } from '@/lib/use-primary-tenant-name';
import { toPlainTextBody } from '@/lib/message-body';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { fileToEmailAttachment } from '@/utils/email-attachment';
import { pdfDownloadLink, splitEmailFiles } from '@/utils/email-download-link';
import { recipientsWithTyped } from '@/utils/email-recipients';

/** Recipients an app message can go to: the tenant only. */
const APP_RECIPIENT_OPTIONS = CONVERSATION_RECIPIENT_OPTIONS.filter((o) => CONVERSATION_APP_RECIPIENTS.has(o.id));

/**
 * Compose a new thread on one Self-Manage property: an email from the agency address to a
 * tenant, owner or contractor, or a message in the tenant's app.
 */
export function NewConversationDialog({
  open,
  onOpenChange,
  propertyOptions,
  templates,
  defaultPropertyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyOptions: readonly ConversationPropertyOption[];
  templates: readonly AgentConversationTemplate[];
  defaultPropertyId: string | null;
  onCreated: (detail: AgentConversationDetail) => void;
}) {
  const { pending, run } = useConversationAction();
  const { properties, archivedProperties } = useAgentData();
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId ?? CONVERSATION_SELECT_PROMPT_VALUE);
  const [channel, setChannel] = useState<ConversationReplyChannel>(CONVERSATION_REPLY_CHANNEL.EMAIL);
  const [recipient, setRecipient] = useState<ConversationRecipient>(CONVERSATION_RECIPIENT.TENANT);
  const [toEmail, setToEmail] = useState('');
  const [tenantTo, setTenantTo] = useState<readonly string[]>([]);
  const [tenantTyped, setTenantTyped] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<readonly AgentConversationAttachmentUpload[]>([]);
  const [linking, setLinking] = useState(false);
  const busy = pending !== null || linking;
  const isApp = channel === CONVERSATION_REPLY_CHANNEL.APP;
  const writingToTenants = !isApp && recipient === CONVERSATION_RECIPIENT.TENANT;
  const selectedProperty = useMemo(() => {
    if (propertyId === CONVERSATION_SELECT_PROMPT_VALUE) return null;
    return (
      properties.find((item) => item.id === propertyId) ??
      archivedProperties.find((item) => item.id === propertyId) ??
      null
    );
  }, [archivedProperties, properties, propertyId]);
  const { tenants: household, ready: householdReady } = useHouseholdTenants(
    writingToTenants ? selectedProperty : null,
  );
  const householdEmails = useMemo(() => emailsOfHouseholdTenants(household), [household]);
  const householdKey = householdEmails.join('\n');
  const tenantEdited = useRef(false);
  useEffect(() => {
    tenantEdited.current = false;
  }, [propertyId, recipient]);
  useEffect(() => {
    if (!writingToTenants || !householdReady || tenantEdited.current) return;
    setTenantTo(householdEmails);
    setTenantTyped('');
  }, [householdEmails, householdKey, householdReady, writingToTenants]);
  const emailRequired = !isApp && CONVERSATION_RECIPIENTS_REQUIRING_EMAIL.has(recipient);
  const tenantAddresses = recipientsWithTyped(tenantTo, tenantTyped);
  const complete =
    propertyId !== CONVERSATION_SELECT_PROMPT_VALUE &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (!emailRequired || toEmail.trim().length > 0);

  const chooseChannel = (next: ConversationReplyChannel) => {
    setChannel(next);
    if (next === CONVERSATION_REPLY_CHANNEL.APP && !CONVERSATION_APP_RECIPIENTS.has(recipient)) {
      setRecipient(CONVERSATION_RECIPIENT.TENANT);
    }
  };

  const addFiles = async (incoming: readonly File[]) => {
    if (incoming.length === 0) return;
    const room = CONVERSATION_ATTACHMENT_LIMITS.maxFiles - attachments.length;
    const { attach, link, errors } = splitEmailFiles(incoming);
    if (attach.length > 0 && room <= 0) {
      toast.error(CONVERSATIONS_COPY.tooManyFiles(CONVERSATION_ATTACHMENT_LIMITS.maxFiles));
    } else if (attach.length > room) {
      toast.error(CONVERSATIONS_COPY.tooManyFiles(CONVERSATION_ATTACHMENT_LIMITS.maxFiles));
    }
    const picked = room > 0 ? attach.slice(0, room) : [];
    const settled = await Promise.allSettled(picked.map((file, index) => fileToEmailAttachment(file, index)));
    const next = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failed = settled.find((result) => result.status === 'rejected');
    if (next.length > 0) setAttachments((prev) => [...prev, ...next]);
    if (failed?.status === 'rejected') {
      const reason = failed.reason;
      toast.error(reason instanceof Error ? reason.message : CONVERSATIONS_COPY.attachFailed);
    }
    for (const message of errors) toast.error(message);
    if (link.length === 0) return;
    setLinking(true);
    try {
      const propertyForFile =
        propertyId !== CONVERSATION_SELECT_PROMPT_VALUE ? propertyId : undefined;
      for (const file of link) {
        try {
          const snippet = await pdfDownloadLink(file, propertyForFile);
          setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n${snippet.text}` : snippet.text));
          toast.success(CONVERSATIONS_COPY.fileLinked(file.name));
        } catch (err) {
          toast.error(err instanceof Error && err.message.trim() ? err.message : CONVERSATIONS_COPY.attachFailed);
        }
      }
    } finally {
      setLinking(false);
    }
  };

  const insertTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const text = toPlainTextBody(template.body);
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
    if (!subject.trim() && template.subject) setSubject(template.subject);
  };

  const submit = async () => {
    if (!complete) return;
    const email = writingToTenants ? (tenantAddresses[0] ?? '') : toEmail.trim();
    const otherTenants = writingToTenants ? tenantAddresses.slice(1) : [];
    let othersMissed: string | null = null;
    const result = await run(CONVERSATION_ACTION.SEND, async () => {
      const created = await createAgentConversation({
        propertyId,
        recipient,
        channel,
        subject: subject.trim(),
        body: body.trim(),
        ...(email && !isApp ? { toEmail: email } : {}),
        ...(attachments.length && !isApp ? { attachments: [...attachments] } : {}),
      });
      // A new thread takes one address. The reply route takes the rest, so a co-tenant is not dropped.
      if (isApp || otherTenants.length === 0) return created;
      try {
        return await replyToAgentConversation(created.conversation.id, {
          channel: CONVERSATION_REPLY_CHANNEL.EMAIL,
          body: body.trim(),
          toEmails: [...otherTenants],
          ...(attachments.length ? { attachments: [...attachments] } : {}),
        });
      } catch (err) {
        othersMissed = apiErrorMessage(err, CONVERSATIONS_COPY.otherTenantsNotSent);
        return created;
      }
    });
    if (!result) return;
    if (isApp) {
      toast.success(CONVERSATIONS_COPY.appSent(`the ${CONVERSATION_APP_NAME[recipient]}`));
    } else if (othersMissed) {
      toast.warning(othersMissed);
    } else if (result.delivery && result.delivery !== CONVERSATION_DELIVERY_SENT) {
      toast.warning(CONVERSATIONS_COPY.notSent(result.delivery));
    } else {
      const sentTo =
        writingToTenants && tenantAddresses.length > 1 ? tenantAddresses.join(', ') : result.sentTo;
      toast.success(sentTo ? `${CONVERSATIONS_COPY.sent}: ${sentTo}` : CONVERSATIONS_COPY.sent);
    }
    onCreated(result.conversation);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{CONVERSATIONS_COPY.composeTitle}</DialogTitle>
          <DialogDescription>{CONVERSATIONS_COPY.composeDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="compose-property">{CONVERSATIONS_COPY.composePropertyLabel}</FieldLabel>
            <select
              id="compose-property"
              className={SELECT_CLASS}
              value={propertyId}
              disabled={busy}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value={CONVERSATION_SELECT_PROMPT_VALUE}>{CONVERSATIONS_COPY.composePropertyPlaceholder}</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{CONVERSATIONS_COPY.channelLabel}</p>
            <FilterChips options={CONVERSATION_CHANNEL_OPTIONS} value={channel} onChange={chooseChannel} />
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{CONVERSATIONS_COPY.composeRecipientLabel}</p>
            <FilterChips
              options={isApp ? APP_RECIPIENT_OPTIONS : CONVERSATION_RECIPIENT_OPTIONS}
              value={recipient}
              onChange={setRecipient}
            />
            {isApp ? <p className="text-muted-foreground mt-1 text-[11px]">{CONVERSATIONS_COPY.composeAppHint}</p> : null}
          </div>

          {isApp ? null : writingToTenants ? (
            <div className="space-y-2">
              {household.length > 0 ? (
                <ul className="space-y-1">
                  {household.map((tenant) => (
                    <li key={tenant.id ?? `${tenant.name}-${tenant.email ?? ''}`} className="text-xs">
                      <span className="font-medium">{tenant.name}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {tenant.email?.trim() || CONVERSATIONS_COPY.noTenantEmail}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <RecipientRow
                label={CONVERSATIONS_COPY.toLabel}
                recipients={tenantTo}
                onChange={(next) => {
                  tenantEdited.current = true;
                  setTenantTo(next);
                }}
                typed={tenantTyped}
                onTypedChange={setTenantTyped}
                disabled={busy || !householdReady}
              />
              <p className="text-muted-foreground text-[11px]">
                {household.length > 1
                  ? CONVERSATIONS_COPY.composeTenantsHint
                  : CONVERSATIONS_COPY.composeEmailOptional}
              </p>
            </div>
          ) : (
            <div>
              <FieldLabel htmlFor="compose-email">{CONVERSATIONS_COPY.composeEmailLabel}</FieldLabel>
              <Input
                id="compose-email"
                type="email"
                value={toEmail}
                disabled={busy}
                onChange={(e) => setToEmail(e.target.value)}
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                {emailRequired ? CONVERSATIONS_COPY.composeEmailRequired : CONVERSATIONS_COPY.composeEmailOptional}
              </p>
            </div>
          )}

          {templates.length > 0 ? (
            <div>
              <FieldLabel htmlFor="compose-template">{CONVERSATIONS_COPY.templateLabel}</FieldLabel>
              <select
                id="compose-template"
                className={SELECT_CLASS}
                value={CONVERSATION_SELECT_PROMPT_VALUE}
                disabled={busy}
                onChange={(e) => insertTemplate(e.target.value)}
              >
                <option value={CONVERSATION_SELECT_PROMPT_VALUE}>{CONVERSATIONS_COPY.templatePlaceholder}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <FieldLabel htmlFor="compose-subject">{CONVERSATIONS_COPY.composeSubjectLabel}</FieldLabel>
            <Input
              id="compose-subject"
              value={subject}
              disabled={busy}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor="compose-body">{CONVERSATIONS_COPY.composeBodyLabel}</FieldLabel>
            <Textarea
              id="compose-body"
              rows={6}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {isApp ? null : (
            <div className="space-y-2">
              <AttachControl
                disabled={busy || attachments.length >= CONVERSATION_ATTACHMENT_LIMITS.maxFiles}
                onPickFiles={(files) => void addFiles(files)}
              />
              <AttachmentChips
                attachments={attachments}
                disabled={busy}
                onRemove={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {CONVERSATIONS_COPY.composeCancel}
          </Button>
          <Button type="button" className="gap-1.5" disabled={busy || !complete} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {CONVERSATIONS_COPY.composeSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
