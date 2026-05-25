'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Wrench,
} from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { cn, displayName } from '@/lib/utils';

const NAV = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { href: ROUTES.MAINTENANCE, label: 'Maintenance', icon: Wrench },
  { href: ROUTES.KEYS, label: 'Key handover', icon: KeyRound },
  { href: ROUTES.VIEWINGS, label: 'Open viewings', icon: Building2 },
] as const;

export function AgentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">CROSSUB</p>
              <p className="text-xs text-muted-foreground">Agent Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {displayName(user)}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-8">
        <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== ROUTES.DASHBOARD && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
