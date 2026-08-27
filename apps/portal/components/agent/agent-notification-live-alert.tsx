'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentNotificationDialog } from '@/components/providers/agent-notification-dialog-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  hasAlertedNotification,
  markNotificationAlerted,
} from '@/lib/notification-alert-state';
import { notificationMatchesPrefs } from '@/lib/notification-prefs';
import { agentNotificationDisplay } from '@/lib/notification-activity';
import { isAgentPaymentNotification } from '@/lib/agent-payment-notification';
import { useAgentStore } from '@/lib/store';
import type { AgentNotification } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';

function alertIcon(type: AgentNotification['type']) {
  if (type === 'urgent') return AlertTriangle;
  if (type === 'approval') return CheckCircle2;
  return FileText;
}

export function AgentNotificationLiveAlert() {
  const router = useRouter();
  const { status } = useAuth();
  const { notifications, loading, markNotificationRead } = useAgentData();
  const { openNotification } = useAgentNotificationDialog();
  const prefs = useAgentStore((s) => s.notificationPrefs);

  const seededRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<AgentNotification[]>([]);
  const [visible, setVisible] = useState(false);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (status !== 'authed' || loading) return;

    const ids = notifications.map((n) => n.id);

    if (!seededRef.current) {
      seededRef.current = true;
      const paymentReminders = notifications.filter(
        (n) =>
          !n.read &&
          isAgentPaymentNotification(n) &&
          notificationMatchesPrefs(n, prefs),
      );
      for (const id of ids) knownIdsRef.current.add(id);
      if (paymentReminders.length > 0) {
        setQueue(paymentReminders);
      }
      return;
    }

    const newcomers = notifications.filter(
      (n) =>
        !knownIdsRef.current.has(n.id) &&
        !n.read &&
        notificationMatchesPrefs(n, prefs) &&
        (isAgentPaymentNotification(n) || !hasAlertedNotification(n.id)),
    );

    for (const id of ids) knownIdsRef.current.add(id);

    if (newcomers.length > 0) {
      setQueue((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        const merged = [...prev];
        for (const n of newcomers) {
          if (seen.has(n.id)) continue;
          seen.add(n.id);
          merged.push(n);
        }
        return merged;
      });
    }
  }, [status, loading, notifications, prefs]);

  useEffect(() => {
    if (current) {
      setVisible(true);
      return;
    }
    setVisible(false);
  }, [current?.id]);

  const dismissCurrent = () => {
    if (!current) return;
    if (!isAgentPaymentNotification(current)) {
      markNotificationAlerted(current.id);
    }
    setVisible(false);
    window.setTimeout(() => {
      setQueue((prev) => prev.filter((n) => n.id !== current.id));
    }, 200);
  };

  const openCurrent = () => {
    if (!current) return;
    if (!isAgentPaymentNotification(current)) {
      markNotificationAlerted(current.id);
    }
    markNotificationRead(current.id);
    setVisible(false);
    window.setTimeout(() => {
      setQueue((prev) => prev.filter((n) => n.id !== current.id));
      const opened = openNotification(current);
      if (!opened) router.push(current.href);
    }, 150);
  };

  if (status !== 'authed' || !current) return null;

  const display = agentNotificationDisplay(current);
  const Icon = alertIcon(current.type);
  const tone =
    current.type === 'urgent'
      ? 'border-destructive/50 bg-background text-foreground'
      : current.type === 'approval'
        ? 'border-primary/50 bg-background text-foreground'
        : 'border-border bg-background text-foreground';

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-[var(--env-banner-height,0px)] z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]',
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-md rounded-2xl border p-4 shadow-2xl ring-1 ring-black/5 transition-all duration-200 dark:ring-white/10',
          tone,
          visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              current.type === 'urgent'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-primary/15 text-primary',
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-primary text-[10px] font-semibold tracking-wider uppercase">
                  New notification
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug">{display.title}</p>
              </div>
              <button
                type="button"
                onClick={dismissCurrent}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1 hover:bg-secondary"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-relaxed">
              {display.body}
            </p>
            {current.actionRequired ? (
              <p className="text-primary mt-1 text-xs font-medium">{current.actionRequired}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 text-[10px]">{formatRelative(current.at)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={openCurrent}>
                Open
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={dismissCurrent}
              >
                Dismiss
              </Button>
              <Link
                href={ROUTES.NOTIFICATIONS}
                onClick={() => {
                  if (!isAgentPaymentNotification(current)) {
                    markNotificationAlerted(current.id);
                  }
                  setQueue((prev) => prev.filter((n) => n.id !== current.id));
                }}
                className="text-primary ml-auto text-[11px] font-medium hover:underline"
              >
                All notifications
              </Link>
            </div>
          </div>
        </div>
        {queue.length > 1 && (
          <p className="text-muted-foreground mt-3 border-t pt-2 text-center text-[10px]">
            +{queue.length - 1} more in queue
          </p>
        )}
      </div>
    </div>
  );
}
