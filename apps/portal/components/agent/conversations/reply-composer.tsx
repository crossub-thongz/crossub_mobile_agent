'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { toast } from 'sonner';

import {
  AttachmentChips,
  ComposerToolbar,
  RecipientRow,
  SendActions,
  SignaturePreview,
} from '@/components/agent/conversations/reply-composer-parts';
import { FilterChips } from '@/components/agent/filter-chips';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  COMPOSER_ENTER_KEY,
  CONVERSATION_ACTION,
  CONVERSATION_AI_DRAFT_DEFAULT_INSTRUCTION,
  CONVERSATION_AI_DRAFT_INSTRUCTION_MIN_CHARS,
  CONVERSATION_ATTACHMENT_LIMITS,
  CONVERSATION_CHANNEL_OPTIONS,
  CONVERSATION_DELIVERY_SENT,
  CONVERSATION_RECIPIENTS_MAX,
  CONVERSATION_REPLY_CHANNEL,
  CONVERSATION_SELECT_PROMPT_VALUE,
  CONVERSATION_SEND_MODE,
  CONVERSATION_STATE_ACTION,
  CONVERSATIONS_COPY,
  type ConversationAction,
  type ConversationReplyChannel,
  type ConversationSendMode,
} from '@/constants/conversations';
import {
  appPartiesLabel,
  conversationAppParties,
  defaultReplyChannel,
  defaultReplyToEmail,
  latestInboundMessageId,
} from '@/lib/agent-conversations';
import {
  emailsOfHouseholdTenants,
  includeHouseholdOnTenantReply,
} from '@/lib/property-parties';
import { useHouseholdTenants } from '@/lib/use-primary-tenant-name';
import {
  draftAgentConversationReply,
  replyToAgentConversation,
  setAgentConversationState,
  type AgentConversationAttachmentUpload,
  type AgentConversationDetail,
  type AgentConversationTemplate,
} from '@/lib/crossub-api/agent-conversation-client';
import { toPlainTextBody } from '@/lib/message-body';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';
import {
  compactComposerHtml,
  insertHtmlAtSelection,
  pastedHtmlToComposerHtml,
  textToEditorHtml,
} from '@/utils/composer-html';
import {
  clearConversationReplyDraft,
  readConversationReplyDraft,
  writeConversationReplyDraft,
} from '@/utils/conversation-reply-draft';
import { fileToEmailAttachment, filesFromDataTransfer, imageFilesFromHtml } from '@/utils/email-attachment';
import { isEmailAddress, recipientsWithTyped, splitEmailList } from '@/utils/email-recipients';

type RunAction = <T>(key: ConversationAction, action: () => Promise<T>) => Promise<T | null>;

/** What the composer starts with: the saved draft for this thread, else the thread's contact. */
function initialState(detail: AgentConversationDetail) {
  const draft = readConversationReplyDraft(detail.id);
  if (draft && draft.text.trim()) {
    return { ...draft, subject: draft.subject || detail.subject, restored: true };
  }
  const to = splitEmailList(defaultReplyToEmail(detail));
  return {
    to,
    cc: [] as string[],
    bcc: [] as string[],
    subject: detail.subject,
    html: '',
    text: '',
    restored: false,
  };
}

/**
 * The reply composer, in step with the admin portal's Conversations composer (Daniel, 21 Oct
 * 2026): To / Cc / Bcc as address chips, subject, a formatting editor, attachments, templates, a
 * Cros draft, the signature line, Save draft, and Send or Send and resolve. On a thread that
 * names the tenant it can also send an app message: text only, into the tenant app.
 */
export function ReplyComposer({
  detail,
  templates,
  pending,
  run,
  onChange,
}: {
  detail: AgentConversationDetail;
  templates: readonly AgentConversationTemplate[];
  pending: ConversationAction | null;
  run: RunAction;
  onChange: (detail: AgentConversationDetail) => void;
}) {
  const { user } = useAuth();
  const { agencies, properties, archivedProperties, apiConnected } = useAgentData();
  const property = useMemo(() => {
    if (!detail.propertyId) return null;
    return (
      properties.find((item) => item.id === detail.propertyId) ??
      archivedProperties.find((item) => item.id === detail.propertyId) ??
      null
    );
  }, [archivedProperties, detail.propertyId, properties]);
  const { tenants: household, ready: householdReady } = useHouseholdTenants(
    apiConnected ? property : null,
  );
  const householdEmails = useMemo(() => emailsOfHouseholdTenants(household), [household]);
  const [init] = useState(() => initialState(detail));
  const [to, setTo] = useState<readonly string[]>(init.to);
  const [cc, setCc] = useState<readonly string[]>(init.cc);
  const [bcc, setBcc] = useState<readonly string[]>(init.bcc);
  const [toTyped, setToTyped] = useState('');
  const [ccTyped, setCcTyped] = useState('');
  const [bccTyped, setBccTyped] = useState('');
  const [showCc, setShowCc] = useState(init.cc.length > 0);
  const [showBcc, setShowBcc] = useState(init.bcc.length > 0);
  const [subject, setSubject] = useState(init.subject);
  const [text, setText] = useState(init.text);
  const [attachments, setAttachments] = useState<readonly AgentConversationAttachmentUpload[]>([]);
  const [instruction, setInstruction] = useState('');
  const [crosOpen, setCrosOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [channel, setChannel] = useState<ConversationReplyChannel>(() => defaultReplyChannel(detail));
  const appParties = useMemo(() => conversationAppParties(detail), [detail]);
  const isApp = channel === CONVERSATION_REPLY_CHANNEL.APP && appParties.length > 0;
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = pending !== null;
  const replyToMessageId = useMemo(() => latestInboundMessageId(detail), [detail]);
  const toTouched = useRef(false);
  const householdApplied = useRef(false);
  // A thread often starts with one tenant's address. Once the household is known, the other
  // tenants go on To as well, unless this reply is to someone outside the tenancy or a draft.
  useEffect(() => {
    if (init.restored || toTouched.current || householdApplied.current || !householdReady) return;
    householdApplied.current = true;
    setTo((current) => includeHouseholdOnTenantReply(current, householdEmails));
  }, [householdEmails, householdReady, init.restored]);
  const changeTo = (next: readonly string[]) => {
    toTouched.current = true;
    setTo(next);
  };
  const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const agencyName = agencies.find((a) => a.id === detail.agencyId)?.name ?? null;

  // The editor is uncontrolled: seed it once.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = init.html ? compactComposerHtml(init.html) : textToEditorHtml(init.text);
    }
  }, [init]);

  const syncEditor = () => {
    setText(editorRef.current?.innerText ?? '');
    setDraftSaved(false);
  };

  const setBody = (body: string, append: boolean) => {
    const el = editorRef.current;
    if (!el) return;
    const html = textToEditorHtml(body);
    el.innerHTML = append && el.innerHTML.trim() ? `${el.innerHTML}<br><br>${html}` : html;
    syncEditor();
  };

  const addFiles = async (incoming: FileList | readonly File[] | null, announce = false) => {
    const files = incoming ? Array.from(incoming) : [];
    if (files.length === 0) return;
    const room = CONVERSATION_ATTACHMENT_LIMITS.maxFiles - attachments.length;
    if (room <= 0) {
      toast.error(CONVERSATIONS_COPY.tooManyFiles(CONVERSATION_ATTACHMENT_LIMITS.maxFiles));
      return;
    }
    if (files.length > room) toast.error(CONVERSATIONS_COPY.tooManyFiles(CONVERSATION_ATTACHMENT_LIMITS.maxFiles));
    const picked = files.slice(0, room);
    const settled = await Promise.allSettled(picked.map((file, index) => fileToEmailAttachment(file, index)));
    const next = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failed = settled.find((result) => result.status === 'rejected');
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
      if (announce) toast.success(CONVERSATIONS_COPY.filesAttached(next.length));
    }
    if (failed?.status === 'rejected') {
      const reason = failed.reason;
      toast.error(reason instanceof Error ? reason.message : CONVERSATIONS_COPY.attachFailed);
    }
  };

  // Pasted text takes the email's own font and size. A pasted or dropped photo becomes an
  // attachment: the body strips <img>, so leaving it in the editor would send nothing.
  const pasteClean = (e: ClipboardEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const pastedFiles = filesFromDataTransfer(e.clipboardData);
    const plainText = plain.replace(/\u00a0/g, ' ').trim();
    // A photo copied on its own arrives as a file, or as an image with no caption. A pasted
    // email that also contains a logo stays text: those images are not the attachment.
    const incoming =
      pastedFiles.length > 0 ? pastedFiles : html && !plainText ? imageFilesFromHtml(html) : [];
    if (incoming.length > 0) {
      e.preventDefault();
      void addFiles(incoming, true);
    }
    if (!el || (!html && !plain)) return;
    if (incoming.length === 0) e.preventDefault();
    const clean = html ? pastedHtmlToComposerHtml(html) : textToEditorHtml(plain);
    if (!clean.trim()) return;
    if (!insertHtmlAtSelection(el, clean)) el.insertAdjacentHTML('beforeend', clean);
    syncEditor();
  };

  const allowFileDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
  };

  const dropFiles = (e: DragEvent<HTMLDivElement>) => {
    const incoming = filesFromDataTransfer(e.dataTransfer);
    if (incoming.length === 0) return;
    e.preventDefault();
    void addFiles(incoming, true);
  };

  const insertTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setBody(toPlainTextBody(template.body), true);
  };

  const crosDraft = async () => {
    const steer = instruction.trim();
    const result = await run(CONVERSATION_ACTION.DRAFT, () =>
      draftAgentConversationReply(detail.id, {
        instruction:
          steer.length >= CONVERSATION_AI_DRAFT_INSTRUCTION_MIN_CHARS ? steer : CONVERSATION_AI_DRAFT_DEFAULT_INSTRUCTION,
      }),
    );
    if (!result) return;
    setCrosOpen(false);
    setBody(result.bodyText, false);
    if (result.subject.trim()) setSubject(result.subject);
    if (result.notice) toast.message(result.notice);
    else toast.success(CONVERSATIONS_COPY.crosDrafted);
  };

  const finalTo = recipientsWithTyped(to, toTyped);
  const finalCc = recipientsWithTyped(cc, ccTyped);
  const finalBcc = recipientsWithTyped(bcc, bccTyped);
  const addressed = new Set(
    [...finalTo, ...finalCc, ...finalBcc].map((email) => email.trim().toLowerCase()),
  );
  const missingTenantEmails = householdReady
    ? householdEmails.filter((email) => !addressed.has(email.toLowerCase()))
    : [];
  const includedTenantEmails = householdEmails.length - missingTenantEmails.length;
  const addTenants = () => {
    toTouched.current = true;
    setTo((current) => {
      const seen = new Set(current.map((email) => email.trim().toLowerCase()));
      const next = [...current];
      for (const email of missingTenantEmails) {
        const key = email.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(email);
      }
      return next;
    });
  };
  const lines = [finalTo, finalCc, finalBcc];
  const badAddress = lines.flat().find((a) => !isEmailAddress(a));
  const blocker = !text.trim()
    ? CONVERSATIONS_COPY.noBody
    : isApp
      ? null
      : badAddress
        ? CONVERSATIONS_COPY.checkAddress(badAddress)
        : lines.some((line) => line.length > CONVERSATION_RECIPIENTS_MAX)
          ? CONVERSATIONS_COPY.tooManyRecipients(CONVERSATION_RECIPIENTS_MAX)
          : null;

  const saveDraft = () => {
    const ok = writeConversationReplyDraft(detail.id, {
      to: [...to],
      cc: [...cc],
      bcc: [...bcc],
      subject,
      html: editorRef.current?.innerHTML ?? '',
      text,
    });
    setDraftSaved(ok);
    if (ok) toast.success(CONVERSATIONS_COPY.draftSaved);
    else toast.error(CONVERSATIONS_COPY.draftNotSaved);
  };

  const send = async (mode: ConversationSendMode) => {
    if (blocker || busy) return;
    const trimmedSubject = subject.trim();
    const bodyHtml = editorRef.current ? compactComposerHtml(editorRef.current.innerHTML) : '';
    const outcome = await run(CONVERSATION_ACTION.SEND, async () => {
      const sent = await replyToAgentConversation(
        detail.id,
        isApp
          ? {
              channel: CONVERSATION_REPLY_CHANNEL.APP,
              body: text.trim(),
              ...(replyToMessageId ? { replyToMessageId } : {}),
            }
          : {
              channel: CONVERSATION_REPLY_CHANNEL.EMAIL,
              body: text.trim(),
              ...(trimmedSubject && trimmedSubject !== detail.subject ? { subject: trimmedSubject } : {}),
              ...(replyToMessageId ? { replyToMessageId } : {}),
              ...(finalTo.length ? { toEmails: [...finalTo] } : {}),
              ...(finalCc.length ? { ccEmails: [...finalCc] } : {}),
              ...(finalBcc.length ? { bccEmails: [...finalBcc] } : {}),
              ...(bodyHtml ? { bodyHtml } : {}),
              ...(attachments.length ? { attachments: [...attachments] } : {}),
            },
      );
      // Only a reply that went out closes the thread; a blocked send must stay in view. An app
      // message is on the thread once saved, so it has no mail delivery to wait on.
      const delivered = isApp || sent.delivery === CONVERSATION_DELIVERY_SENT;
      const resolve =
        mode === CONVERSATION_SEND_MODE.SEND_AND_RESOLVE && delivered && !sent.conversation.resolved;
      if (!resolve) return { sent, conversation: sent.conversation, resolveError: null };
      try {
        const resolved = await setAgentConversationState(detail.id, CONVERSATION_STATE_ACTION.RESOLVE);
        return { sent, conversation: resolved, resolveError: null };
      } catch (err) {
        return { sent, conversation: sent.conversation, resolveError: apiErrorMessage(err) };
      }
    });
    if (!outcome) return;
    const { sent, conversation, resolveError } = outcome;
    clearConversationReplyDraft(detail.id);
    if (editorRef.current) editorRef.current.innerHTML = '';
    setText('');
    setAttachments([]);
    setInstruction('');
    setDraftSaved(false);
    onChange(conversation);
    if (isApp) {
      toast.success(CONVERSATIONS_COPY.appSent(appPartiesLabel(appParties)));
    } else if (sent.delivery && sent.delivery !== CONVERSATION_DELIVERY_SENT) {
      toast.warning(CONVERSATIONS_COPY.notSent(sent.delivery));
    } else {
      toast.success(sent.sentTo ? `${CONVERSATIONS_COPY.sent}: ${sent.sentTo}` : CONVERSATIONS_COPY.sent);
    }
    if (resolveError) toast.error(CONVERSATIONS_COPY.sentNotResolved, { description: resolveError });
  };

  const composerExtras = (
    <>
      {templates.length > 0 ? (
        <select
          aria-label={CONVERSATIONS_COPY.templateLabel}
          className={cn(SELECT_CLASS, 'h-7 w-36 text-xs')}
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
      ) : null}
      <Popover open={crosOpen} onOpenChange={setCrosOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={busy}>
            {pending === CONVERSATION_ACTION.DRAFT ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/cros-logo.png" alt="" className="size-4 object-contain" />
            )}
            {CONVERSATIONS_COPY.crosLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-2">
          <Input
            className="h-8 text-xs"
            placeholder={CONVERSATIONS_COPY.crosInstructionPlaceholder}
            value={instruction}
            disabled={busy}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === COMPOSER_ENTER_KEY) {
                e.preventDefault();
                void crosDraft();
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={busy} onClick={() => void crosDraft()}>
              {CONVERSATIONS_COPY.crosDraftButton}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );

  const toggle = (label: string, onClick: () => void) => (
    <button type="button" className="text-muted-foreground hover:text-foreground text-xs" onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="max-h-[60vh] shrink-0 overflow-y-auto border-t px-4 py-3">
      <div
        className="bg-card rounded-xl border shadow-sm"
        onDragOver={allowFileDrop}
        onDrop={dropFiles}
      >
        <div className="flex min-w-0 items-center gap-2 border-b px-4 py-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {isApp
              ? CONVERSATIONS_COPY.appReplyHeading(appPartiesLabel(appParties))
              : CONVERSATIONS_COPY.replyHeading(finalTo.length > 1 ? finalTo.join(', ') : finalTo[0])}
          </p>
          {init.restored ? (
            <span className="text-muted-foreground shrink-0 text-[11px]">{CONVERSATIONS_COPY.draftRestored}</span>
          ) : null}
        </div>

        {appParties.length > 0 ? (
          <div className="flex min-w-0 items-center gap-2 px-4 pt-3">
            <span className="text-muted-foreground w-12 shrink-0 text-xs">{CONVERSATIONS_COPY.channelLabel}</span>
            <div className="min-w-0 flex-1">
              <FilterChips options={CONVERSATION_CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
            </div>
          </div>
        ) : null}

        {isApp ? (
          <div className="space-y-2 px-4 pt-3">
            <p className="text-muted-foreground text-[11px]">{CONVERSATIONS_COPY.appHint}</p>
            <div className="flex flex-wrap items-center justify-end gap-2">{composerExtras}</div>
          </div>
        ) : (
          <div className="space-y-2 px-4 pt-3">
            <RecipientRow
              label={CONVERSATIONS_COPY.toLabel}
              recipients={to}
              onChange={changeTo}
              typed={toTyped}
              onTypedChange={setToTyped}
              disabled={busy}
              trailing={
                <>
                  {!showCc ? toggle(CONVERSATIONS_COPY.ccLabel, () => setShowCc(true)) : null}
                  {!showBcc ? toggle(CONVERSATIONS_COPY.bccLabel, () => setShowBcc(true)) : null}
                </>
              }
            />
            {missingTenantEmails.length > 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-primary text-xs font-medium hover:underline"
                  disabled={busy}
                  onClick={addTenants}
                >
                  {includedTenantEmails > 0
                    ? CONVERSATIONS_COPY.addOtherTenants(missingTenantEmails.length)
                    : CONVERSATIONS_COPY.addTenants(missingTenantEmails.length)}
                </button>
              </div>
            ) : null}
            {showCc ? (
              <RecipientRow
                label={CONVERSATIONS_COPY.ccLabel}
                recipients={cc}
                onChange={setCc}
                typed={ccTyped}
                onTypedChange={setCcTyped}
                disabled={busy}
              />
            ) : null}
            {showBcc ? (
              <RecipientRow
                label={CONVERSATIONS_COPY.bccLabel}
                recipients={bcc}
                onChange={setBcc}
                typed={bccTyped}
                onTypedChange={setBccTyped}
                disabled={busy}
              />
            ) : null}
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground w-12 shrink-0 text-xs">{CONVERSATIONS_COPY.replySubjectLabel}</span>
              <Input
                aria-label={CONVERSATIONS_COPY.replySubjectLabel}
                className="h-8 min-w-0 flex-1 text-xs"
                value={subject}
                disabled={busy}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setDraftSaved(false);
                }}
              />
            </div>

            <ComposerToolbar
              editorRef={editorRef}
              onEdited={syncEditor}
              onAttach={() => fileInputRef.current?.click()}
              attachDisabled={attachments.length >= CONVERSATION_ATTACHMENT_LIMITS.maxFiles}
              disabled={busy}
            >
              {composerExtras}
            </ComposerToolbar>
          </div>
        )}

        <div className="space-y-2 px-4 pt-2">
          <div
            ref={editorRef}
            contentEditable={!busy}
            role="textbox"
            aria-multiline="true"
            aria-label={CONVERSATIONS_COPY.replyBodyLabel}
            onInput={syncEditor}
            onPaste={pasteClean}
            data-placeholder={CONVERSATIONS_COPY.replyPlaceholder}
            suppressContentEditableWarning
            className="empty:before:text-muted-foreground max-h-[24vh] min-h-[88px] w-full overflow-auto rounded-md text-sm leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] [&_a]:text-teal-700 [&_a]:underline dark:[&_a]:text-teal-300 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          />
          {isApp ? null : (
            <>
              <SignaturePreview name={senderName} agencyName={agencyName} />
              <AttachmentChips
                attachments={attachments}
                disabled={busy}
                onRemove={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))}
              />
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2 pb-3">
          <p className="text-muted-foreground min-w-0 truncate text-[11px]">
            {blocker ?? (draftSaved ? CONVERSATIONS_COPY.draftSaved : '')}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={saveDraft}>
              {CONVERSATIONS_COPY.saveDraft}
            </Button>
            <SendActions
              disabled={!!blocker || busy}
              sending={pending === CONVERSATION_ACTION.SEND}
              onSend={(mode) => void send(mode)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
