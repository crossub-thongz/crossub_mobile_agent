'use client';

import {
  Bold,
  ChevronDown,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  RemoveFormatting,
  Send,
  Underline,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  COMPOSER_BACKSPACE_KEY,
  COMPOSER_ENTER_KEY,
  COMPOSER_FORMAT_COMMAND,
  COMPOSER_RECIPIENT_COMMIT_KEYS,
  CONVERSATION_SEND_MODE,
  CONVERSATIONS_COPY,
  type ComposerFormatCommand,
  type ConversationSendMode,
} from '@/constants/conversations';
import type { AgentConversationAttachmentUpload } from '@/lib/crossub-api/agent-conversation-client';
import { compactComposerHtml, escapeHtml } from '@/utils/composer-html';
import { addRecipient } from '@/utils/email-recipients';

/**
 * One To / Cc / Bcc line: the added addresses as chips, and a box to type the next one. Enter,
 * comma, semicolon, Tab or Add commits it; Backspace on an empty box takes the last chip off.
 */
export function RecipientRow({
  label,
  recipients,
  onChange,
  typed,
  onTypedChange,
  disabled,
  trailing,
}: {
  label: string;
  recipients: readonly string[];
  onChange: (next: readonly string[]) => void;
  typed: string;
  onTypedChange: (value: string) => void;
  disabled: boolean;
  trailing?: ReactNode;
}) {
  const commit = () => {
    const next = addRecipient(recipients, typed);
    if (next !== recipients) onChange(next);
    onTypedChange('');
  };

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="text-muted-foreground w-8 shrink-0 pt-1.5 text-xs">{label}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {recipients.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {recipients.map((address) => (
              <li
                key={address}
                className="bg-muted inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
              >
                <span className="min-w-0 truncate">{address}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={CONVERSATIONS_COPY.removeRecipient(address)}
                  disabled={disabled}
                  onClick={() => onChange(recipients.filter((r) => r !== address))}
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-1.5">
          <Input
            aria-label={label}
            type="email"
            className="h-8 min-w-0 flex-1 text-xs"
            placeholder={CONVERSATIONS_COPY.recipientPlaceholder}
            value={typed}
            disabled={disabled}
            onChange={(e) => onTypedChange(e.target.value)}
            onBlur={() => {
              if (typed.trim()) commit();
            }}
            onKeyDown={(e) => {
              if (COMPOSER_RECIPIENT_COMMIT_KEYS.has(e.key) && typed.trim()) {
                e.preventDefault();
                commit();
              } else if (e.key === COMPOSER_BACKSPACE_KEY && !typed && recipients.length > 0) {
                onChange(recipients.slice(0, -1));
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs"
            disabled={disabled || !typed.trim()}
            onClick={commit}
          >
            {CONVERSATIONS_COPY.addRecipient}
          </Button>
        </div>
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2 pt-1.5">{trailing}</div> : null}
    </div>
  );
}

/** A compact toolbar button that keeps the editor's selection when pressed. */
function ToolButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  );
}

/** `document.execCommand` is deprecated but still the only editing API browsers ship; best-effort. */
function runCommand(command: ComposerFormatCommand, value?: string) {
  try {
    document.execCommand(command, false, value);
  } catch {
    // An unsupported command is a no-op, never a crash.
  }
}

/**
 * Bold, italic, underline, lists, clear pasted styling and link on the editor, attach, and the
 * caller's own controls (template, Cros) on the right.
 */
export function ComposerToolbar({
  editorRef,
  onEdited,
  onAttach,
  attachDisabled,
  disabled,
  children,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onEdited: () => void;
  onAttach: () => void;
  attachDisabled: boolean;
  disabled: boolean;
  children?: ReactNode;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const savedRange = useRef<Range | null>(null);

  const format = (command: ComposerFormatCommand) => {
    editorRef.current?.focus();
    runCommand(command);
    onEdited();
  };

  // Evens out text pasted with its own font and size: bold, lists and links are kept.
  const clearPastedStyling = () => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = compactComposerHtml(el.innerHTML);
    el.focus();
    onEdited();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0);
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    setLinkUrl('');
    const el = editorRef.current;
    if (!url || !el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (sel && !sel.isCollapsed) runCommand(COMPOSER_FORMAT_COMMAND.CREATE_LINK, url);
    else runCommand(COMPOSER_FORMAT_COMMAND.INSERT_HTML, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    onEdited();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-y py-1">
      <ToolButton label={CONVERSATIONS_COPY.bold} icon={Bold} disabled={disabled} onClick={() => format(COMPOSER_FORMAT_COMMAND.BOLD)} />
      <ToolButton label={CONVERSATIONS_COPY.italic} icon={Italic} disabled={disabled} onClick={() => format(COMPOSER_FORMAT_COMMAND.ITALIC)} />
      <ToolButton
        label={CONVERSATIONS_COPY.underline}
        icon={Underline}
        disabled={disabled}
        onClick={() => format(COMPOSER_FORMAT_COMMAND.UNDERLINE)}
      />
      <ToolButton
        label={CONVERSATIONS_COPY.bulletedList}
        icon={List}
        disabled={disabled}
        onClick={() => format(COMPOSER_FORMAT_COMMAND.BULLETED_LIST)}
      />
      <ToolButton
        label={CONVERSATIONS_COPY.numberedList}
        icon={ListOrdered}
        disabled={disabled}
        onClick={() => format(COMPOSER_FORMAT_COMMAND.NUMBERED_LIST)}
      />
      <ToolButton
        label={CONVERSATIONS_COPY.clearFormatting}
        icon={RemoveFormatting}
        disabled={disabled}
        onClick={clearPastedStyling}
      />
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={CONVERSATIONS_COPY.insertLink}
            title={CONVERSATIONS_COPY.insertLink}
            disabled={disabled}
            onMouseDown={saveSelection}
          >
            <LinkIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-2">
          <p className="text-xs font-medium">{CONVERSATIONS_COPY.insertLink}</p>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={CONVERSATIONS_COPY.linkPlaceholder}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === COMPOSER_ENTER_KEY) {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>
              {CONVERSATIONS_COPY.addLink}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <ToolButton
        label={CONVERSATIONS_COPY.attachFile}
        icon={Paperclip}
        onClick={onAttach}
        disabled={disabled || attachDisabled}
      />
      {children ? <div className="ml-auto flex items-center gap-1.5">{children}</div> : null}
    </div>
  );
}

/** The files picked for the send, each removable. */
export function AttachmentChips({
  attachments,
  disabled,
  onRemove,
}: {
  attachments: readonly AgentConversationAttachmentUpload[];
  disabled: boolean;
  onRemove: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {attachments.map((file, i) => (
        <li
          key={`${file.fileName}:${i}`}
          className="bg-muted/40 inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
        >
          <Paperclip className="text-muted-foreground size-3 shrink-0" />
          <span className="min-w-0 truncate">{file.fileName}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5"
            aria-label={CONVERSATIONS_COPY.removeAttachment(file.fileName)}
            disabled={disabled}
            onClick={() => onRemove(i)}
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Who the email is from, and that the server signs it (the admin portal's composer shows the same). */
export function SignaturePreview({ name, agencyName }: { name: string; agencyName: string | null }) {
  return (
    <div className="bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/crossub-logo.png" alt="CROSSUB" className="size-5 shrink-0 rounded object-contain" />
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
        <span className="text-foreground font-medium">{name || CONVERSATIONS_COPY.yourName}</span>
        {agencyName ? ` · ${agencyName}` : null}
        {' — '}
        {CONVERSATIONS_COPY.signatureHint}
      </p>
    </div>
  );
}

/** Send, with "Send and resolve" behind the arrow. */
export function SendActions({
  disabled,
  sending,
  onSend,
}: {
  disabled: boolean;
  sending: boolean;
  onSend: (mode: ConversationSendMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const choose = (mode: ConversationSendMode) => {
    setOpen(false);
    onSend(mode);
  };
  return (
    <div className="flex items-center">
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 rounded-r-none"
        disabled={disabled}
        onClick={() => onSend(CONVERSATION_SEND_MODE.SEND)}
      >
        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        {CONVERSATIONS_COPY.send}
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-l-none border-l border-l-white/20 px-2"
            disabled={disabled}
            aria-label={CONVERSATIONS_COPY.sendOptions}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          <button
            type="button"
            className="hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm"
            onClick={() => choose(CONVERSATION_SEND_MODE.SEND)}
          >
            {CONVERSATIONS_COPY.send}
          </button>
          <button
            type="button"
            className="hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm"
            onClick={() => choose(CONVERSATION_SEND_MODE.SEND_AND_RESOLVE)}
          >
            {CONVERSATIONS_COPY.sendAndResolve}
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
