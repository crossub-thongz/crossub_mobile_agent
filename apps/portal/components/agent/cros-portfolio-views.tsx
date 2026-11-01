'use client';

import { useMemo, type ReactNode } from 'react';
import { ArrowUpRight, ClipboardList, Compass, Headphones, Home, MessageSquare, Trash2, Wrench } from 'lucide-react';

import { CrosPageRecommendation } from '@/components/agent/recommendation-slideshow';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { CROS_HELP_TOPIC, CROS_PANEL_TAB, CROS_TODAY_PROMPT } from '@/constants/cros-panel';
import { CROS_TODAY_QUESTION } from '@/constants/gii-briefing';
import { GII_CONVERSATION_COPY } from '@/constants/gii-conversation';
import { GII_HANDOFF_COPY } from '@/constants/gii-handoff';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  vacatingDetail,
} from '@/constants/routes';
import type { GiiConversationSummary } from '@/lib/crossub-api/gii-client';
import { buildDashboardBoard } from '@/lib/dashboard-board';
import { formatPropertyDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

/** Today: what needs the agent and what Cros can help with. Chat: the conversation. History: past chats. */
export type CrosPortfolioView = 'today' | 'chat' | 'history';

type HelpTopic = {
  id: string;
  title: string;
  prompt: string;
  icon: typeof Home;
};

export function CrosPortfolioTabs({
  view,
  onView,
  todayCount,
  teamChatHolder,
  onTeam,
}: {
  view: CrosPortfolioView;
  onView: (view: CrosPortfolioView) => void;
  /** What needs the agent; the same number as the Cros button. */
  todayCount: number;
  /** Set while a CROSSUB person holds the chat: their name, or null when nobody is named yet. */
  teamChatHolder: { name: string | null } | null;
  /** Back to the chat a person holds, or ask Cros to hand this one to the team. */
  onTeam: () => void;
}) {
  const teamLabel = teamChatHolder
    ? GII_HANDOFF_COPY.BACK_TO_TEAM(teamChatHolder.name)
    : GII_HANDOFF_COPY.TALK_TO_TEAM;
  const tabs: { id: CrosPortfolioView; label: string; icon: typeof Compass; count?: number }[] = [
    { id: 'today', label: CROS_PANEL_TAB.TODAY, icon: Compass, count: todayCount },
    { id: 'chat', label: CROS_PANEL_TAB.CHAT, icon: MessageSquare },
  ];

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-[#ccece3] px-3 py-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onView(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold',
              active ? 'bg-[#e7f8f2] text-[#067a56]' : 'text-slate-500 hover:bg-white/70',
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
            {tab.count ? (
              <span className="rounded-full bg-[#00bd85] px-1.5 text-[11px] leading-4 font-bold text-white">
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onTeam}
        aria-label={teamLabel}
        title={teamLabel}
        className="relative ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#d7eee6] bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-[#067a56] hover:border-[#00bd85]"
      >
        <Headphones className="size-3.5" />
        {GII_HANDOFF_COPY.TEAM_BUTTON}
        {teamChatHolder ? (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-[#00bd85]" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onView('history')}
        aria-label={CROS_PANEL_TAB.HISTORY}
        title={CROS_PANEL_TAB.HISTORY}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          view === 'history' ? 'bg-[#e7f8f2] text-[#067a56]' : 'text-slate-500 hover:bg-white/70',
        )}
      >
        <HistoryIcon className="size-4" />
      </button>
    </div>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

/** The Today tab's suggested questions and help topics. No counts: the briefing carries those. */
export function useCrosPortfolioModel() {
  const { user } = useAuth();
  const data = useAgentData();
  const fullService = data.hasFullManagementAccess;

  return useMemo(() => {
    const board = buildDashboardBoard({
      properties: data.properties,
      rentReviews: data.rentReviews,
      inspections: data.inspections,
      maintenance: data.maintenanceAll,
      vacating: data.vacating,
      accounting: data.accounting,
      needActionItems: data.needActionItems,
      rentReviewHref: (id) => rentReviewDetail(id),
      inspectionHref: (id) => inspectionDetail(id),
      vacatingHref: (id) => vacatingDetail(id),
      maintenanceHref: (id) => maintenanceDetail(id),
      fullService,
    });
    const events = [...board.lanes.decision, ...board.lanes.arranged, ...board.lanes.upcoming];

    const prompts: { id: string; label: string; prompt: string }[] = [
      { id: CROS_TODAY_QUESTION.ID, label: CROS_TODAY_QUESTION.LABEL, prompt: CROS_TODAY_QUESTION.TEXT },
    ];
    if (fullService && board.attention.rentReviews.overdue > 0) prompts.push(CROS_TODAY_PROMPT.OVERDUE_RENT);
    if (events.some((event) => event.sort <= 7)) prompts.push(CROS_TODAY_PROMPT.WEEK);

    const topics: HelpTopic[] = fullService
      ? [
          { ...CROS_HELP_TOPIC.RENT, icon: ClipboardList },
          { ...CROS_HELP_TOPIC.LEASES, icon: Home },
          { ...CROS_HELP_TOPIC.REPAIRS, icon: Wrench },
          { ...CROS_HELP_TOPIC.INSPECTIONS, icon: ClipboardList },
        ]
      : [{ ...CROS_HELP_TOPIC.INSPECTIONS, icon: ClipboardList }];

    return {
      firstName: user?.firstName?.trim() || '',
      prompts: prompts.slice(0, 3),
      topics,
    };
  }, [data, fullService, user?.firstName]);
}

export function CrosPortfolioBody({
  view,
  wide = false,
  briefing = null,
  onAsk,
  onAskToday,
  history,
  onOpenHistory,
  onDeleteHistory,
  onNewChat,
}: {
  view: Exclude<CrosPortfolioView, 'chat'>;
  wide?: boolean;
  /** Today's server briefing (Jarvis 2.2), shown under the questions when it loaded. */
  briefing?: ReactNode;
  onAsk: (prompt: string) => void;
  /** "What needs me today?": asks with the briefing's rows, when the panel has them. */
  onAskToday?: () => void;
  history: GiiConversationSummary[];
  onOpenHistory: (entry: GiiConversationSummary) => void;
  onDeleteHistory: (entry: GiiConversationSummary) => void;
  onNewChat: () => void;
}) {
  const model = useCrosPortfolioModel();

  if (view === 'today') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {model.firstName ? `Good to see you, ${model.firstName}` : 'Good to see you'}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.prompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.id === CROS_TODAY_QUESTION.ID && onAskToday ? onAskToday() : onAsk(item.prompt)
                }
                className="rounded-full border border-[#d7eee6] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#00bd85]"
              >
                {item.label} <span className="text-[#00bd85]">↗</span>
              </button>
            ))}
          </div>
        </div>

        <CrosPageRecommendation />

        {briefing ? <section>{briefing}</section> : null}

        <section>
          <h3 className="text-sm font-bold text-slate-900">What can I help with?</h3>
          <ul
            className={cn(
              'mt-2 divide-y divide-[#e3f3ed] overflow-hidden rounded-2xl border border-[#d7eee6] bg-white',
              wide && 'sm:grid sm:grid-cols-2 sm:divide-y-0',
            )}
          >
            {model.topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => onAsk(topic.prompt)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#f3fbf8]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e7f8f2] text-[#067a56]">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                      {topic.title}
                    </span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-[#00bd85]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Recent conversations</h2>
        <button type="button" onClick={onNewChat} className="text-sm font-semibold text-[#067a56]">
          New chat
        </button>
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-slate-500">{GII_CONVERSATION_COPY.EMPTY}</p>
      ) : (
        history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 rounded-2xl border border-[#d7eee6] bg-white hover:border-[#00bd85]"
          >
            <button
              type="button"
              onClick={() => onOpenHistory(entry)}
              className="min-w-0 flex-1 p-3 text-left"
            >
              <p className="truncate text-sm font-bold text-slate-900">{entry.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatPropertyDateTime(entry.lastMessageAt)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onDeleteHistory(entry)}
              aria-label={`${GII_CONVERSATION_COPY.DELETE} ${entry.title}`}
              className="mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
