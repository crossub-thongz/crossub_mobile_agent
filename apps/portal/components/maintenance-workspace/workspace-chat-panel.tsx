'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, MessageSquareText, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { ApiMaintenanceAuditLogEntry } from '@/lib/crossub-api/types';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { cn, formatDateTime } from '@/lib/utils';

type ChatMessage = {
  id: string;
  who: string;
  text: string;
  atIso: string;
  channel: 'in_app' | 'email';
  direction: 'inbound' | 'outbound' | 'system';
};

const STORAGE_KEY = 'crossub-portal-maintenance-chat.v1';

function loadStoredMessages(caseId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
    return parsed[caseId] ?? [];
  } catch {
    return [];
  }
}

function saveStoredMessages(caseId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
    parsed[caseId] = messages;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

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

export function WorkspaceChatPanel({
  workspaceCase,
  agentName,
}: {
  workspaceCase: MaintenanceWorkspaceCase;
  agentName: string;
}) {
  const [chatTab, setChatTab] = useState<'app' | 'email'>('app');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = loadStoredMessages(workspaceCase.id);
    const seeds = mergeMessages(
      [],
      [
        ...seedFromNotifications(workspaceCase.notifications, workspaceCase.responsibility),
        ...seedFromAudit(workspaceCase.auditEntries),
      ],
    );
    setMessages(mergeMessages(stored, seeds));
    setHydrated(true);
  }, [workspaceCase]);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredMessages(workspaceCase.id, messages);
  }, [hydrated, messages, workspaceCase.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatTab]);

  const appMessages = useMemo(
    () => messages.filter((m) => m.channel === 'in_app'),
    [messages],
  );
  const emailMessages = useMemo(
    () => messages.filter((m) => m.channel === 'email'),
    [messages],
  );
  const visibleMessages = chatTab === 'app' ? appMessages : emailMessages;

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      who: agentName || 'Agent',
      text,
      atIso: new Date().toISOString(),
      channel: chatTab === 'app' ? 'in_app' : 'email',
      direction: 'outbound',
    };

    setMessages((prev) => [...prev, msg]);
    setDraft('');
    toast.success(chatTab === 'app' ? 'In-app message sent' : 'Email message sent');
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {workspaceCase.id} · {workspaceCase.issueType}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Replying to: {workspaceCase.tenant?.name ?? 'Tenant'} · {workspaceCase.address}
        </p>
      </div>

      <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-1 py-2">
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
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold">
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
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold">
              {emailMessages.length}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
          {visibleMessages.length === 0 ? (
            <div className="bg-muted/40 text-muted-foreground rounded-lg p-4 text-center text-xs">
              {chatTab === 'app'
                ? 'No in-app messages yet. Send a note to start the conversation.'
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
                        <span className="text-muted-foreground text-[10px]">
                          {formatDateTime(msg.atIso)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="p-1 pt-2">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder={
                chatTab === 'app'
                  ? 'Write an in-app message…'
                  : 'Write an email message…'
              }
              className="bg-muted/40 focus:ring-primary/20 min-h-[44px] flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
            />
            <Button
              type="button"
              size="sm"
              className="h-10 shrink-0 gap-1.5"
              disabled={!draft.trim()}
              onClick={sendMessage}
            >
              <Send className="size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
