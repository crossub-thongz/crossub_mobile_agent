'use client';

import Link from 'next/link';
import { ChevronRight, Moon, Sun } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useTheme } from '@/components/theme-provider';
import { ROUTES } from '@/constants/routes';
import { useAgentStore, type NotificationPrefs } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { hasFullManagementAccess } = useAgentData();
  const { resolvedTheme, setTheme } = useTheme();
  const prefs = useAgentStore((s) => s.notificationPrefs);
  const setPref = useAgentStore((s) => s.setNotificationPref);

  const toggles: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    {
      key: 'approvals',
      label: 'Approval requests',
      description: 'Quotes, rent reviews, tenant applications',
    },
    {
      key: 'urgent',
      label: 'Urgent alerts',
      description: 'Overdue maintenance and escalations',
    },
    {
      key: 'updates',
      label: 'Status updates',
      description: 'Inspection complete, messages, general updates',
    },
  ];

  return (
    <AgentShell title="Settings" backHref={ROUTES.PROFILE}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium',
                resolvedTheme === 'light'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <Sun className="size-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium',
                resolvedTheme === 'dark'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <Moon className="size-4" />
              Dark
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          {toggles.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                aria-label={`${label} notifications`}
                onClick={() => setPref(key, !prefs[key])}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  prefs[key] ? 'bg-primary' : 'bg-secondary',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                    prefs[key] ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </button>
            </div>
          ))}
          <p className="text-muted-foreground px-1 text-[11px]">
            Preferences are saved on this device and control which alerts appear in the
            notification bell and live pop-ups.
          </p>
        </section>

        <section className="rounded-xl border bg-card divide-y">
          {hasFullManagementAccess ? (
            <Link
              href={ROUTES.TENANTS}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              Tenant accounts
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>
          ) : null}
          <Link
            href={ROUTES.PROFILE}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            Profile & phonebook
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
          <Link
            href={`${ROUTES.CHANGE_PASSWORD}?from=settings`}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            Change password
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
        </section>
      </div>
    </AgentShell>
  );
}
