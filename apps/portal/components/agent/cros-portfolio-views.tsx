'use client';

import { useMemo, type ReactNode } from 'react';
import {
  ArrowUpRight,
  ClipboardList,
  Compass,
  Home,
  MessageSquare,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';

import { ServiceRecommendation } from '@/components/agent/service-recommendation-card';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { GII_CONVERSATION_COPY } from '@/constants/gii-conversation';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  vacatingDetail,
} from '@/constants/routes';
import type { GiiConversationSummary } from '@/lib/crossub-api/gii-client';
import { buildDashboardBoard, type DashboardEvent } from '@/lib/dashboard-board';
import { formatPropertyDateTime } from '@/lib/format-datetime';
import type { PropertyNeedAction } from '@/lib/types';
import { cn } from '@/lib/utils';

export type CrosPortfolioView = 'discover' | 'chat' | 'insights' | 'history';

type InsightRow = {
  id: string;
  section: 'attention' | 'upcoming';
  title: string;
  address: string;
  detail: string;
  prompt: string;
};

type HelpTile = {
  id: string;
  title: string;
  detail: string;
  prompt: string;
  icon: typeof Home;
};

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function countPrompt(count: number, noun: string, tail: string): string {
  const verb = count === 1 ? 'needs' : 'need';
  return `Help me with ${plural(count, noun)} that ${verb} ${tail}.`;
}

function eventKind(title: string): string {
  const value = title.toLowerCase();
  if (value.includes('rent')) return 'rent';
  if (value.includes('lease')) return 'lease';
  if (value.includes('maintenance') || value.includes('quote')) return 'maintenance';
  if (value.includes('inspection')) return 'inspection';
  if (value.includes('vacat')) return 'vacating';
  return value;
}

function attentionKind(item: PropertyNeedAction): string {
  const label = `${item.category} ${item.label}`.toLowerCase();
  if (label.includes('rent')) return 'rent';
  if (label.includes('lease') || label.includes('renew')) return 'lease';
  if (item.category === 'Maintenance' || label.includes('maintenance') || label.includes('repair')) {
    return 'maintenance';
  }
  if (item.category === 'Inspection' || label.includes('inspection')) return 'inspection';
  if (label.includes('vacat')) return 'vacating';
  return item.category.toLowerCase();
}

function promptFor(title: string, address: string, detail: string): string {
  const where = address ? ` at ${address}` : '';
  const extra = detail ? ` ${detail}.` : '';
  return `Help me with ${title}${where}.${extra}`.replace(/\s+/g, ' ').trim();
}

export function CrosPortfolioTabs({
  view,
  onView,
  insightCount,
}: {
  view: CrosPortfolioView;
  onView: (view: CrosPortfolioView) => void;
  insightCount: number;
}) {
  const tabs: { id: CrosPortfolioView; label: string; icon: typeof Compass; count?: number }[] = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'insights', label: 'Insights', icon: Sparkles, count: insightCount },
    { id: 'history', label: 'History', icon: Home },
  ];

  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-b border-[#ccece3] px-3 py-2">
      {tabs.map((tab) => {
        const Icon = tab.id === 'history' ? HistoryIcon : tab.icon;
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

export function useCrosPortfolioModel() {
  const { user } = useAuth();
  const data = useAgentData();
  const fullService = data.hasFullManagementAccess;

  return useMemo(() => {
    const attention = data.needActionItems.filter((item) => {
      if (fullService) return true;
      return item.category === 'Inspection' || item.category === 'Tribunal';
    });
    const board = buildDashboardBoard({
      properties: data.properties,
      rentReviews: data.rentReviews,
      inspections: data.inspections,
      maintenance: data.maintenanceAll,
      vacating: data.vacating,
      accounting: data.accounting,
      needActionItems: attention,
      rentReviewHref: (id) => rentReviewDetail(id),
      inspectionHref: (id) => inspectionDetail(id),
      vacatingHref: (id) => vacatingDetail(id),
      maintenanceHref: (id) => maintenanceDetail(id),
      fullService,
    });
    const events = [...board.lanes.decision, ...board.lanes.arranged, ...board.lanes.upcoming];
    const covered = new Set(attention.map((item) => `${item.propertyId}:${attentionKind(item)}`));
    const upcoming = events.filter((event) => {
      const propertyId = propertyIdFromEvent(event, data.properties);
      if (!propertyId) return true;
      return !covered.has(`${propertyId}:${eventKind(event.title)}`);
    });

    const insights: InsightRow[] = [
      ...attention.map((item) => ({
        id: `attention-${item.id}`,
        section: 'attention' as const,
        title: item.label,
        address: item.propertyAddress,
        detail: item.category,
        prompt: promptFor(item.label, item.propertyAddress, item.category),
      })),
      ...upcoming.map((event) => ({
        id: `event-${event.id}`,
        section: 'upcoming' as const,
        title: event.title,
        address: event.address,
        detail: event.detail,
        prompt: promptFor(event.title, event.address, event.detail),
      })),
    ];

    const weekCount = events.filter((event) => event.sort <= 7).length;
    const prompts: { id: string; label: string; prompt: string }[] = [];
    if (attention.length > 0) {
      prompts.push({
        id: 'attention',
        label: 'What needs my attention?',
        prompt: `What needs my attention? There are ${plural(attention.length, 'item')} waiting in my portfolio.`,
      });
    }
    if (fullService && board.attention.rentReviews.overdue > 0) {
      const overdue = board.attention.rentReviews.overdue;
      prompts.push({
        id: 'overdue-rent',
        label: 'Show overdue rent reviews',
        prompt: `Show my ${plural(overdue, 'overdue rent review')}.`,
      });
    }
    if (weekCount > 0) {
      prompts.push({
        id: 'week',
        label: 'Summarise this week',
        prompt: `Summarise the ${plural(weekCount, 'portfolio event')} due within the next 7 days.`,
      });
    }
    if (prompts.length === 0) {
      prompts.push({
        id: 'portfolio',
        label: 'Summarise my portfolio',
        prompt: 'Summarise what is happening across my portfolio right now.',
      });
    }

    const tiles: HelpTile[] = [];
    if (fullService) {
      const rentWaiting = board.attention.rentReviews.count;
      const rentOverdue = board.attention.rentReviews.overdue;
      tiles.push({
        id: 'rent',
        title: 'Rent reviews',
        icon: ClipboardList,
        detail:
          rentOverdue > 0
            ? `${rentOverdue} overdue`
            : rentWaiting > 0
              ? `${rentWaiting} open`
              : 'Nothing waiting',
        prompt:
          rentOverdue > 0
            ? `Show my ${plural(rentOverdue, 'overdue rent review')}.`
            : rentWaiting > 0
              ? `Help me with the ${plural(rentWaiting, 'open rent review')}.`
              : 'Are there any rent reviews coming up in my portfolio?',
      });
      const leaseWaiting = board.attention.leaseRenewals.dueSoon;
      const leaseComing = board.attention.leaseRenewals.count;
      tiles.push({
        id: 'lease',
        title: 'Lease renewals',
        icon: Home,
        detail:
          leaseWaiting > 0
            ? `${leaseWaiting} due soon`
            : leaseComing > 0
              ? `${leaseComing} coming up`
              : 'Nothing waiting',
        prompt:
          leaseWaiting > 0
            ? `Help me with the ${plural(leaseWaiting, 'lease renewal')} due soon.`
            : leaseComing > 0
              ? `Show the ${plural(leaseComing, 'lease renewal')} coming up.`
              : 'Are there any lease renewals coming up in my portfolio?',
      });
      const maintenanceWaiting = attention.filter((item) => item.category === 'Maintenance').length;
      const maintenanceOverdue = board.activity.maintenance.overdue;
      tiles.push({
        id: 'maintenance',
        title: 'Maintenance',
        icon: Wrench,
        detail:
          maintenanceWaiting > 0
            ? `${maintenanceWaiting} waiting`
            : maintenanceOverdue > 0
              ? `${maintenanceOverdue} overdue`
              : 'Nothing waiting',
        prompt:
          maintenanceWaiting > 0
            ? countPrompt(maintenanceWaiting, 'maintenance job', 'attention')
            : maintenanceOverdue > 0
              ? `Show the ${plural(maintenanceOverdue, 'overdue maintenance job')}.`
              : 'Are there any maintenance jobs coming up in my portfolio?',
      });
    }
    tiles.push(
      helpTile(
        'inspections',
        'Inspections',
        board.activity.inspections.pendingFeedback,
        'inspection',
        ClipboardList,
      ),
    );

    const highlights = [
      ...board.lanes.decision.map((event) => ({
        id: event.id,
        title: event.title,
        body: [event.address, event.detail].filter(Boolean).join(' · '),
        action: 'Review with CROS',
        prompt: promptFor(event.title, event.address, event.detail),
      })),
      ...attention.map((item) => ({
        id: item.id,
        title: item.label,
        body: [item.propertyAddress, item.category].filter(Boolean).join(' · '),
        action: 'Review with CROS',
        prompt: promptFor(item.label, item.propertyAddress, item.category),
      })),
    ].filter((item, index, all) => all.findIndex((other) => other.prompt === item.prompt) === index)
      .slice(0, 3);

    return {
      firstName: user?.firstName?.trim() || '',
      loading: data.loading,
      prompts: prompts.slice(0, 3),
      tiles,
      highlights,
      insights,
      attentionCount: attention.length,
      upcomingCount: upcoming.length,
    };
  }, [data, fullService, user?.firstName]);
}

function propertyIdFromEvent(
  event: DashboardEvent,
  properties: { id: string; address: string; suburb?: string }[],
): string | null {
    const match = properties.find((property) => {
      const address = [property.address, property.suburb].filter(Boolean).join(', ');
      return (
        address === event.address ||
        property.address === event.address ||
        event.address.includes(property.address)
      );
    });
  return match?.id ?? null;
}

function helpTile(
  id: string,
  title: string,
  count: number,
  noun: string,
  icon: typeof Home,
): HelpTile {
  const waiting = count > 0;
  return {
    id,
    title,
    icon,
    detail: waiting ? `${count} waiting` : 'Nothing waiting',
    prompt: waiting
      ? countPrompt(count, noun, 'attention')
      : `Are there any ${noun}s coming up in my portfolio?`,
  };
}

export function CrosPortfolioBody({
  view,
  wide = false,
  briefing = null,
  onAsk,
  history,
  onOpenHistory,
  onDeleteHistory,
  onNewChat,
}: {
  view: Exclude<CrosPortfolioView, 'chat'>;
  wide?: boolean;
  /** Today's server briefing (Jarvis 2.2), shown first on Discover when it loaded. */
  briefing?: ReactNode;
  onAsk: (prompt: string) => void;
  history: GiiConversationSummary[];
  onOpenHistory: (entry: GiiConversationSummary) => void;
  onDeleteHistory: (entry: GiiConversationSummary) => void;
  onNewChat: () => void;
}) {
  const model = useCrosPortfolioModel();

  if (view === 'discover') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#00bd85] uppercase">
            AI-powered workspace
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {model.firstName ? `Good to see you, ${model.firstName}` : 'Good to see you'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            I already know the context of your portfolio. What would you like to get done today?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.prompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAsk(item.prompt)}
                className="rounded-full border border-[#d7eee6] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#00bd85]"
              >
                {item.label} <span className="text-[#00bd85]">↗</span>
              </button>
            ))}
          </div>
        </div>

        <ServiceRecommendation surface="cros" />

        {briefing ? <section>{briefing}</section> : null}

        <section>
          <h3 className="text-sm font-bold text-slate-900">What can I help with?</h3>
          <div className={cn('mt-2 grid gap-2', wide ? 'sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1')}>
            {model.tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => onAsk(tile.prompt)}
                  className="rounded-2xl border border-[#d7eee6] bg-white p-3 text-left hover:border-[#00bd85]"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[#e7f8f2] text-[#067a56]">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {tile.title} <ArrowUpRight className="inline size-3.5 text-[#00bd85]" />
                  </p>
                  <p className="text-xs text-slate-500">{tile.detail}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-slate-900">Intelligent highlights</h3>
          {model.loading ? (
            <p className="mt-2 text-sm text-slate-500">Loading your portfolio…</p>
          ) : model.highlights.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing in the portfolio needs attention right now.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {model.highlights.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#d7eee6] bg-white p-3">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.body}</p>
                  <button
                    type="button"
                    onClick={() => onAsk(item.prompt)}
                    className="mt-2 text-sm font-semibold text-[#067a56]"
                  >
                    {item.action} →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (view === 'insights') {
    return (
      <InsightsList
        loading={model.loading}
        insights={model.insights}
        attentionCount={model.attentionCount}
        upcomingCount={model.upcomingCount}
        onAsk={onAsk}
      />
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

function InsightsList({
  loading,
  insights,
  attentionCount,
  upcomingCount,
  onAsk,
}: {
  loading: boolean;
  insights: InsightRow[];
  attentionCount: number;
  upcomingCount: number;
  onAsk: (prompt: string) => void;
}) {
  if (loading) return <p className="text-sm text-slate-500">Loading your portfolio…</p>;
  if (insights.length === 0) {
    return <p className="text-sm text-slate-500">No upcoming events or items need your attention.</p>;
  }
  const attention = insights.filter((row) => row.section === 'attention');
  const upcoming = insights.filter((row) => row.section === 'upcoming');
  return (
    <div className="space-y-4">
      <InsightSection title="Needs your attention" count={attentionCount} rows={attention} onAsk={onAsk} />
      <InsightSection title="Upcoming events" count={upcomingCount} rows={upcoming} onAsk={onAsk} />
    </div>
  );
}

function InsightSection({
  title,
  count,
  rows,
  onAsk,
}: {
  title: string;
  count: number;
  rows: InsightRow[];
  onAsk: (prompt: string) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-900">
        {title} <span className="text-slate-400">{count}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">None right now.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-[#d7eee6] bg-white p-3">
              <p className="text-sm font-bold text-slate-900">{row.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[row.address, row.detail].filter(Boolean).join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => onAsk(row.prompt)}
                className="mt-2 text-sm font-semibold text-[#067a56]"
              >
                Ask {CROS_ASSISTANT_NAME} →
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
