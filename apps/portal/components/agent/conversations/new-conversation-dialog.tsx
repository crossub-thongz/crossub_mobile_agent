'use client';

import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ConversationPropertyOption } from '@/components/agent/conversations/conversation-list';
import { FilterChips } from '@/components/agent/filter-chips';
import { FieldLabel, SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
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
  CONVERSATION_DELIVERY_SENT,
  CONVERSATION_RECIPIENT,
  CONVERSATION_RECIPIENT_OPTIONS,
  CONVERSATION_RECIPIENTS_REQUIRING_EMAIL,
  CONVERSATION_SELECT_PROMPT_VALUE,
  CONVERSATIONS_COPY,
  type ConversationRecipient,
} from '@/constants/conversations';
import { useConversationAction } from '@/hooks/use-agent-conversations';
import {
  createAgentConversation,
  type AgentConversationDetail,
  type AgentConversationTemplate,
} from '@/lib/crossub-api/agent-conversation-client';
import { toPlainTextBody } from '@/lib/message-body';

/** Compose a new email thread from the agency address to a party on one Self-Manage property. */
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
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId ?? CONVERSATION_SELECT_PROMPT_VALUE);
  const [recipient, setRecipient] = useState<ConversationRecipient>(CONVERSATION_RECIPIENT.TENANT);
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const busy = pending !== null;
  const emailRequired = CONVERSATION_RECIPIENTS_REQUIRING_EMAIL.has(recipient);
  const complete =
    propertyId !== CONVERSATION_SELECT_PROMPT_VALUE &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (!emailRequired || toEmail.trim().length > 0);

  const insertTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const text = toPlainTextBody(template.body);
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
    if (!subject.trim() && template.subject) setSubject(template.subject);
  };

  const submit = async () => {
    if (!complete) return;
    const email = toEmail.trim();
    const result = await run(CONVERSATION_ACTION.SEND, () =>
      createAgentConversation({
        propertyId,
        recipient,
        subject: subject.trim(),
        body: body.trim(),
        ...(email ? { toEmail: email } : {}),
      }),
    );
    if (!result) return;
    if (result.delivery && result.delivery !== CONVERSATION_DELIVERY_SENT) {
      toast.warning(CONVERSATIONS_COPY.notSent(result.delivery));
    } else {
      toast.success(result.sentTo ? `${CONVERSATIONS_COPY.sent}: ${result.sentTo}` : CONVERSATIONS_COPY.sent);
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
            <p className="text-muted-foreground mb-1 text-xs font-medium">{CONVERSATIONS_COPY.composeRecipientLabel}</p>
            <FilterChips options={CONVERSATION_RECIPIENT_OPTIONS} value={recipient} onChange={setRecipient} />
          </div>

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
