'use client';

import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { useAgentStore, type NotificationPrefs } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { apiConnected } = useAgentData();
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
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Connection</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {apiConnected
              ? 'Live maintenance data from crossub_web'
              : 'Demo mode — connect API_INTERNAL_URL on Render for live data'}
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Bell className="text-muted-foreground size-4" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          {toggles.map(({ key, label, description }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
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
            </label>
          ))}
          <p className="text-muted-foreground px-1 text-[11px]">
            Preferences saved on this device. Push notifications when connected to
            crossub_web.
          </p>
        </section>

        <section className="rounded-xl border bg-card divide-y">
          <Link
            href={ROUTES.PROFILE}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            Profile & phonebook
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            Password help
            <ChevronRight className="text-muted-foreground size-4" />
          </Link>
        </section>
      </div>
    </AgentShell>
  );
}
