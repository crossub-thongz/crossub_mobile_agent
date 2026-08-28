'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessageSquare, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AgentNotificationBell } from '@/components/agent/agent-notification-bell';
import { AgentSidebarStatus } from '@/components/layout/agent-sidebar-status';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ROUTES } from '@/constants/routes';
import { cn, displayName } from '@/lib/utils';

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
  onLogout,
}: {
  unreadNotificationCount: number;
  onLogout: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { messages } = useAgentData();
  const [profileOpen, setProfileOpen] = useState(false);

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
        className="v2-frosted-surface hover:border-border flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors"
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

        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="hover:bg-card/70 ml-1 flex min-w-0 items-center gap-2.5 rounded-xl py-1.5 pr-1 pl-1.5 transition-colors"
            >
              <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden min-w-0 text-left xl:block">
                <span className="text-foreground block truncate text-sm font-semibold leading-tight">
                  {name}
                </span>
                <span className="text-primary block truncate text-xs leading-tight">{role}</span>
              </span>
              <ChevronDown className="text-muted-foreground hidden size-4 shrink-0 xl:block" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-2">
            <div className="space-y-0.5">
              <Link
                href={ROUTES.PROFILE}
                onClick={() => setProfileOpen(false)}
                className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium"
              >
                Profile
              </Link>
              <Link
                href={ROUTES.SETTINGS}
                onClick={() => setProfileOpen(false)}
                className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="text-muted-foreground hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm"
              >
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
