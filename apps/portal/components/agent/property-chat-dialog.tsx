'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, MessageSquareText, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { MessageBody } from '@/components/agent/message-body';
import { MessageCompose } from '@/components/agent/message-compose';
import { MessageThreadBubble } from '@/components/agent/message-thread-bubble';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import type { MessageCategory, ThreadMessage } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

function parseEmailMessage(
  msg: ThreadMessage,
  threadSubject?: string,
): {
  title: string;
  body: string;
} {
  const text = msg.body.trim();
  const subjectMatch = text.match(/Subject:\s*([^\n]+)/i);
  const title =
    subjectMatch?.[1]?.trim() ??
    threadSubject?.trim() ??
    `Email from ${msg.from}`;
  const bodyMatch = text.match(/Subject:\s*[^\n]+\n\n([\s\S]*)$/i);
  const body = bodyMatch?.[1]?.trim() ?? (subjectMatch ? '' : text);

  return { title, body: body || text };
}

export function PropertyChatDialog({
  open,
  onClose,
  propertyId,
  propertyAddress,
  category = 'Leasing',
  title = 'Property messages',
  caseId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress?: string;
  category?: MessageCategory;
  title?: string;
  caseId?: string;
}) {
  const { messages, properties, sendMessage, ensureMessageThread } = useAgentData();
  const [chatTab, setChatTab] = useState<'app' | 'email'>('app');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const property = properties.find((p) => p.id === propertyId);
  const address =
    propertyAddress ??
    property?.address ??
    messages.find((m) => m.propertyId === propertyId)?.propertyAddress ??
    '—';

  const thread = useMemo(() => {
    if (activeThreadId) {
      const byId = messages.find((m) => m.id === activeThreadId);
      if (byId) return byId;
    }
    return messages.find((m) => {
      if (m.propertyId !== propertyId) return false;
      if (caseId) return m.relatedCaseId === caseId;
      return m.messageCategory === category || m.taskType === category;
    });
  }, [messages, propertyId, category, caseId, activeThreadId]);

  useEffect(() => {
    if (!open || !propertyId) {
      setActiveThreadId(null);
      return;
    }
    const id = ensureMessageThread(propertyId, {
      category,
      caseId,
      subject: caseId ? title : `${category} — ${address}`,
    });
    if (id) setActiveThreadId(id);
  }, [open, propertyId, category, caseId, address, title, ensureMessageThread]);

  const appMessages = useMemo(
    () => (thread?.messages ?? []).filter((m) => m.channel === 'app'),
    [thread],
  );
  const emailMessages = useMemo(
    () => (thread?.messages ?? []).filter((m) => m.channel === 'email'),
    [thread],
  );

  const parsedEmails = useMemo(
    () => emailMessages.map((msg) => ({ msg, ...parseEmailMessage(msg, thread?.subject) })),
    [emailMessages, thread?.subject],
  );

  const selectedEmail = useMemo(() => {
    if (parsedEmails.length === 0) return null;
    return parsedEmails.find((e) => e.msg.id === selectedEmailId) ?? parsedEmails[parsedEmails.length - 1];
  }, [parsedEmails, selectedEmailId]);

  useEffect(() => {
    if (chatTab !== 'email' || parsedEmails.length === 0) return;
    setSelectedEmailId((prev) => {
      if (prev && parsedEmails.some((e) => e.msg.id === prev)) return prev;
      return parsedEmails[parsedEmails.length - 1]?.msg.id ?? null;
    });
  }, [chatTab, parsedEmails]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, thread?.messages.length, chatTab, selectedEmailId]);

  const handleSend = () => {
    const text = draft.trim();
    const threadId = thread?.id ?? activeThreadId;
    if (!text || !threadId) return;

    if (chatTab === 'email') {
      const subject = text.split('\n')[0]?.trim() || 'Case update';
      const body = text.includes('\n') ? text : `Subject: ${subject}\n\n${text}`;
      sendMessage(threadId, body, undefined, 'email');
    } else {
      sendMessage(threadId, text, undefined, 'app');
    }

    setDraft('');
    toast.success(chatTab === 'app' ? 'In-app message sent' : 'Email sent');
  };

  const handleClose = () => {
    setDraft('');
    setChatTab('app');
    setSelectedEmailId(null);
    setActiveThreadId(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-background flex h-[min(92vh,780px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <p className="text-muted-foreground truncate text-xs">{address}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
          <div className="border-border bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <div className="border-border flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
              <button
                type="button"
                onClick={() => setChatTab('app')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  chatTab === 'app'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
                )}
              >
                <MessageSquareText className="size-4" />
                App Messages
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold">
                  {appMessages.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChatTab('email')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  chatTab === 'email'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
                )}
              >
                <Mail className="size-4" />
                Email
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold">
                  {emailMessages.length}
                </span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {chatTab === 'app' ? (
                <div className="h-full overflow-y-auto px-2 py-3">
                  {appMessages.length === 0 ? (
                    <div className="bg-muted/40 text-muted-foreground m-1 rounded-lg p-4 text-center text-xs">
                      No in-app messages yet. Send a note to start the conversation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appMessages.map((msg) => (
                        <MessageThreadBubble
                          key={msg.id}
                          msg={msg}
                          textSize="text-xs"
                          maxWidth="max-w-[85%]"
                        />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
              ) : emailMessages.length === 0 ? (
                <div className="bg-muted/40 text-muted-foreground m-3 rounded-lg p-4 text-center text-xs">
                  No emails yet. Sent emails will appear here.
                </div>
              ) : (
                <div className="flex h-full min-h-0">
                  <div className="border-border w-[36%] min-w-[128px] shrink-0 overflow-y-auto border-r sm:w-[32%]">
                    <div className="divide-y">
                      {parsedEmails.map((item) => {
                        const selected = item.msg.id === selectedEmail?.msg.id;
                        return (
                          <button
                            key={item.msg.id}
                            type="button"
                            onClick={() => setSelectedEmailId(item.msg.id)}
                            className={cn(
                              'w-full px-3 py-3 text-left transition-colors',
                              selected ? 'bg-primary/5' : 'hover:bg-secondary/40',
                            )}
                          >
                            <p className="line-clamp-3 text-sm font-semibold leading-snug">
                              {item.title}
                            </p>
                            <p className="text-muted-foreground mt-1.5 text-[10px] tabular-nums">
                              {formatDateTime(item.msg.at)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 overflow-y-auto p-4">
                    {selectedEmail ? (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-[11px]">
                          {selectedEmail.msg.from} · {formatDateTime(selectedEmail.msg.at)}
                        </p>
                        <div className="rounded-lg border bg-card/40 p-3 text-sm leading-relaxed">
                          <MessageBody body={selectedEmail.body} className="text-sm" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">Select an email to read.</p>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-border border-t p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  data-input-kind="message"
                  data-allow-emoji
                  maxLength={5000}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={chatTab === 'email' ? 3 : 2}
                  placeholder={
                    chatTab === 'app'
                      ? 'Write an in-app message…'
                      : 'Write an email message…'
                  }
                  className="border-border focus:ring-primary/20 min-h-[44px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5"
                  disabled={!draft.trim() || !(thread?.id ?? activeThreadId)}
                  onClick={handleSend}
                >
                  <Send className="size-3.5" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
