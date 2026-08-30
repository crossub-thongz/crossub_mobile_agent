'use client';

import Link from 'next/link';
import { useMemo, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Send, X } from 'lucide-react';

import {
  crosNoteForAttentionItem,
  DashboardAttentionCard,
} from '@/components/agent/dashboard/dashboard-attention-card';
import { CrosAssistantLogoBadge } from '@/components/brand/cros-assistant-logo';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { DASHBOARD_GII_PROMPTS } from '@/constants/gii-prompts';
import { ROUTES } from '@/constants/routes';
import { formatDashboardMoney } from '@/lib/dashboard-home';
import { cn } from '@/lib/utils';

const ATTENTION_LIMIT = 4;

export function DashboardNeedsAttentionPanel({ onOpenItem }: { onOpenItem?: () => void }) {
  const { needActionItems, maintenanceAll, rentReviews } = useAgentData();
  const attention = useMemo(() => needActionItems.slice(0, ATTENTION_LIMIT), [needActionItems]);

  return (
    <section className="normal-case flex h-full min-h-0 flex-col">
      <div className="border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight">Needs Your Attention</h2>
            {needActionItems.length > 0 ? (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                {needActionItems.length}
              </span>
            ) : null}
          </div>
          <Link href={ROUTES.TASKS} className="text-primary shrink-0 text-xs font-medium hover:underline">
            View All
          </Link>
        </div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {attention.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <DashboardAttentionCard
                  item={item}
                  compact
                  note={crosNoteForAttentionItem(
                    item,
                    maintenanceAll,
                    rentReviews,
                    formatDashboardMoney,
                  )}
                  onOpen={onOpenItem}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function DashboardAskCrosPanel({
  query,
  onQueryChange,
  onSubmit,
  onPrompt,
  sending,
  hasMessages,
  chatScrollRef,
  chatEndRef,
  onClose,
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onPrompt: (prompt: string) => void;
  sending?: boolean;
  hasMessages?: boolean;
  chatScrollRef?: RefObject<HTMLDivElement | null>;
  chatEndRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const { user } = useAuth();
  const firstName = user?.firstName?.trim() || 'there';

  return (
    <section className="normal-case flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CrosAssistantLogoBadge size="md" />
          <p className="truncate text-sm font-semibold">Ask {CROS_ASSISTANT_NAME}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            aria-label={`Close ${CROS_ASSISTANT_NAME}`}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div
        ref={chatScrollRef}
        className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
      >
        {children}

        {!hasMessages ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              Hi {firstName}, I&apos;m {CROS_ASSISTANT_NAME}. How can I help you today?
            </p>
            <div className="flex flex-wrap gap-2">
              {DASHBOARD_GII_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={sending}
                  onClick={() => onPrompt(prompt.prompt)}
                  className="bg-muted/60 hover:bg-muted rounded-full px-3 py-1.5 text-left text-xs font-medium transition disabled:opacity-60"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div ref={chatEndRef} aria-hidden className="h-px w-full shrink-0" />
      </div>

      <div className="shrink-0 border-t px-4 py-3">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ask Anything…"
            disabled={sending}
            className="border-input v2-frosted-surface h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !query.trim()}
            className={cn(
              'bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
        <p className="text-muted-foreground mt-2 text-center text-[10px]">
          {CROS_ASSISTANT_NAME} Can Make Mistakes. Check Important Info.
        </p>
      </div>
    </section>
  );
}
