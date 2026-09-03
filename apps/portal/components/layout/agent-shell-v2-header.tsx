'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { AgentNotificationBell } from '@/components/agent/agent-notification-bell';
import { AgentSidebarStatus } from '@/components/layout/agent-sidebar-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { CrosAssistantLogoBadge } from '@/components/brand/cros-assistant-logo';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
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
  showCrosLauncher = false,
}: {
  unreadNotificationCount: number;
  /** Desktop header CROS when the Ask CROS rail is not on screen. */
  showCrosLauncher?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { messages } = useAgentData();
  const openGii = useShellDockStore((s) => s.openGii);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const giiExpanded = useShellDockStore((s) => s.giiExpanded);

  const messageUnread = useMemo(
    () => messages.reduce((sum, thread) => sum + (thread.unread > 0 ? thread.unread : 0), 0),
    [messages],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        router.push(ROUTES.SEARCH);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  if (!user) return null;

  const name = displayName(user);
  const initials = userInitials(user);
  const role = userRoleLabel(user);

  return (
    <header className="agent-shell-v2-header border-border/50 hidden w-full shrink-0 items-center gap-4 border-b px-6 py-3 lg:flex">
      <Link
        href={ROUTES.SEARCH}
        className="v2-frosted-surface hover:border-border flex w-full max-w-sm min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors"
      >
        <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
          Search properties, tasks, tenants…
        </span>
        <kbd className="text-muted-foreground hidden shrink-0 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘ K
        </kbd>
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showCrosLauncher ? (
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
          href={ROUTES.MESSAGES}
          className="text-muted-foreground hover:bg-card/70 relative flex size-10 items-center justify-center rounded-xl transition-colors"
          aria-label={messageUnread > 0 ? `Messages, ${messageUnread} unread` : 'Messages'}
        >
          <MessageSquare className="size-5" />
          {messageUnread > 0 ? (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
          ) : null}
        </Link>

        <AgentNotificationBell
          unreadCount={unreadNotificationCount}
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
