'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { AgentNotificationBell } from '@/components/agent/agent-notification-bell';
import { AgentGlobalSearch } from '@/components/layout/agent-global-search';
import { AgentSidebarStatus } from '@/components/layout/agent-sidebar-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { CrosAssistantLogoBadge } from '@/components/brand/cros-assistant-logo';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentInbox } from '@/components/providers/agent-inbox-provider';
import { useShellAsideStore } from '@/lib/shell-aside-store';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { ROUTES } from '@/constants/routes';
import { displayName } from '@/lib/utils';

function userInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const first = user.firstName?.trim()?.[0] ?? '';
  const last = user.lastName?.trim()?.[0] ?? '';
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

function userRoleLabel(user: { jobTitle?: string | null; role?: string }): string {
  const title = user.jobTitle?.trim();
  if (title) return title;
  if (user.role?.toLowerCase().includes('account')) return 'Agent';
  return 'Agent';
}

export function AgentShellV2Header({
  unreadNotificationCount,
  showCrosLauncher,
}: {
  unreadNotificationCount?: number;
  /** Desktop header CROS when the Ask CROS rail is not on screen. */
  showCrosLauncher?: boolean;
} = {}) {
  const { user } = useAuth();
  const { unreadNotificationCount: liveUnread } = useAgentData();
  const headerCrosLauncher = useShellAsideStore((state) => state.headerCrosLauncher);
  const unreadCount = unreadNotificationCount ?? liveUnread;
  const showLauncher = showCrosLauncher ?? headerCrosLauncher;
  const openGii = useShellDockStore((s) => s.openGii);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);

  const inbox = useAgentInbox();

  if (!user) return null;

  const name = displayName(user);
  const initials = userInitials(user);
  const role = userRoleLabel(user);

  return (
    <header className="agent-shell-v2-header border-border/50 hidden w-full shrink-0 items-center gap-4 border-b px-6 py-3 lg:flex">
      <AgentGlobalSearch />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showLauncher ? (
          <button
            type="button"
            onClick={() => openGii()}
            aria-label={`Ask ${CROS_ASSISTANT_NAME}`}
            aria-pressed={activePanel === 'gii' && giiExpanded}
            className="hover:bg-card/70 flex size-10 items-center justify-center rounded-xl transition-colors"
          >
            <CrosAssistantLogoBadge size="sm" />
          </button>
        ) : null}
        <AgentSidebarStatus variant="header" />
        <ThemeToggle className="size-10 rounded-xl hover:bg-card/70" />

        <div className="bg-border/60 mx-1 hidden h-8 w-px lg:block" aria-hidden />

        <Link
          href={inbox.href}
          className="text-muted-foreground hover:bg-card/70 relative flex size-10 items-center justify-center rounded-xl transition-colors"
          aria-label={inbox.unread > 0 ? `${inbox.label}, ${inbox.unread} unread` : inbox.label}
        >
          <MessageSquare className="size-5" />
          {inbox.unread > 0 ? (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
          ) : null}
        </Link>

        <AgentNotificationBell
          unreadCount={unreadCount}
          className="size-10 rounded-xl hover:bg-card/70"
          iconClassName="size-5"
          badgeClassName="bg-rose-500 ring-background"
        />

        <div className="ml-1 flex min-w-0 items-center gap-2.5 py-1.5 pr-1 pl-1.5">
          <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left xl:block">
            <span className="text-foreground block truncate text-sm font-semibold leading-tight">
              {name}
            </span>
            <span className="text-primary block truncate text-xs leading-tight">{role}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
