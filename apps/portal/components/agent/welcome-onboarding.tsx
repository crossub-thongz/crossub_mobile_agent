'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { WelcomeVideoPlayer } from '@/components/agent/welcome-video-player';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { ROUTES, propertyNew } from '@/constants/routes';
import {
  dismissPortalWelcome,
  fetchPortalWelcomeStatus,
  type AgentPortalWelcomeStatus,
} from '@/lib/crossub-api/agent-client';
import { notifyPortalWelcomeDismissed } from '@/lib/agent-page-guide-events';

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
      notifyPortalWelcomeDismissed();
    } catch {
      setWelcomeStatus((current) =>
        current ? { ...current, dismissed: true } : current,
      );
      notifyPortalWelcomeDismissed();
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
      <div className="relative w-full max-w-2xl rounded-xl border bg-card p-5 shadow-xl">
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          className="text-muted-foreground absolute top-3 right-3 z-10 rounded-lg p-1 hover:bg-secondary"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
        <div className="pr-8">
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            {CROS_ASSISTANT_NAME} · Welcome
          </p>
          <h2 className="mt-1 text-lg font-semibold">Welcome to your agent portal</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Watch this short intro to get started. You can replay it anytime from More → Support → Intro video.
          </p>
        </div>
        <WelcomeVideoPlayer autoPlay className="mt-4" />
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild disabled={dismissing} onClick={() => void dismiss()}>
            <Link href={propertyNew()}>
              {hasFullManagementAccess
                ? 'Add your first property'
                : 'Add a property for inspection'}
            </Link>
          </Button>
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
