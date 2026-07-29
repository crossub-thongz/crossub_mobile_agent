'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Building2, LayoutDashboard, ListTodo, MessageSquare, X } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES, propertyNew } from '@/constants/routes';
import {
  dismissPortalWelcome,
  fetchPortalWelcomeStatus,
  type AgentPortalWelcomeStatus,
} from '@/lib/crossub-api/agent-client';

export function WelcomeOnboarding() {
  const { user, status } = useAuth();
  const { hasFullManagementAccess } = useAgentData();
  const [welcomeStatus, setWelcomeStatus] = useState<AgentPortalWelcomeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (status !== 'authed' || !user) {
      setWelcomeStatus(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchPortalWelcomeStatus()
      .then((result) => {
        if (!cancelled) setWelcomeStatus(result);
      })
      .catch(() => {
        if (!cancelled) setWelcomeStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);

  const dismiss = useCallback(async () => {
    setDismissing(true);
    try {
      const result = await dismissPortalWelcome();
      setWelcomeStatus(result);
    } catch {
      setWelcomeStatus((current) =>
        current ? { ...current, dismissed: true } : current,
      );
    } finally {
      setDismissing(false);
    }
  }, []);

  if (
    status !== 'authed' ||
    !user ||
    loading ||
    !welcomeStatus?.eligible ||
    welcomeStatus.dismissed
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          className="text-muted-foreground absolute top-3 right-3 rounded-lg p-1 hover:bg-secondary"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
        <p className="text-primary text-xs font-semibold uppercase">Welcome</p>
        <h2 className="mt-1 text-lg font-semibold">Your agent portal</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Approve quotes, track jobs by status, message landlords and tenants, and
          manage your portfolio — all from your phone.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <LayoutDashboard className="text-primary size-4 shrink-0" />
            <span>
              <strong>Dashboard</strong> — portfolio KPIs at a glance
            </span>
          </li>
          <li className="flex items-center gap-2">
            <ListTodo className="text-primary size-4 shrink-0" />
            <span>
              <strong>Tasks</strong> — your need-action queue
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MessageSquare className="text-primary size-4 shrink-0" />
            <span>
              <strong>Messages</strong> — chat per property
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Building2 className="text-primary size-4 shrink-0" />
            <span>
              <strong>Properties</strong> — add listings to your portfolio
            </span>
          </li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          {hasFullManagementAccess && (
            <Button asChild disabled={dismissing} onClick={() => void dismiss()}>
              <Link href={propertyNew()}>Add your first property</Link>
            </Button>
          )}
          <Button variant="outline" asChild disabled={dismissing} onClick={() => void dismiss()}>
            <Link href={ROUTES.TASKS}>View need-action queue</Link>
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            disabled={dismissing}
            onClick={() => void dismiss()}
          >
            Got it — explore the app
          </Button>
        </div>
      </div>
    </div>
  );
}
