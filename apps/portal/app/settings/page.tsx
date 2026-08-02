'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentPageGuides } from '@/components/providers/agent-page-guide-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useAgentStore, type NotificationPrefs } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { hasFullManagementAccess } = useAgentData();
  const { resetGuides } = useAgentPageGuides();
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

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Help</h2>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">FAQ</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Common questions about leasing, maintenance, inspections, rent review, billing, and
              portal access.
            </p>
            <Link
              href={ROUTES.FAQ}
              className="text-primary mt-3 inline-block text-sm font-medium"
            >
              View FAQ →
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Page guides</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Short onboarding guides appear the first time you open each main section. Progress
              is saved to your account.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                void resetGuides()
                  .then(() => {
                    toast.success('Page guides reset — open a section to see its guide again');
                    router.push(ROUTES.DASHBOARD);
                  })
                  .catch(() => {
                    toast.error('Could not reset page guides. Try again.');
                  });
              }}
            >
              Replay page guides
            </Button>
          </div>
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
