'use client';

import { useCallback, useEffect, useState } from 'react';

import { WelcomeVideoPlayer } from '@/components/agent/welcome-video-player';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  dismissPortalWelcome,
  fetchPortalWelcomeStatus,
  type AgentPortalWelcomeStatus,
} from '@/lib/crossub-api/agent-client';
import { notifyPortalWelcomeDismissed } from '@/lib/agent-page-guide-events';

export function WelcomeOnboarding() {
  const { user, status } = useAuth();
  const [welcomeStatus, setWelcomeStatus] = useState<AgentPortalWelcomeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (status !== 'authed' || !user) {
      setWelcomeStatus(null);
      setVideoEnded(false);
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

  useEffect(() => {
    if (!welcomeStatus?.eligible || welcomeStatus.dismissed) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const blockKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [welcomeStatus?.eligible, welcomeStatus?.dismissed]);

  const dismiss = useCallback(async () => {
    if (!videoEnded || dismissing) return;
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
  }, [dismissing, videoEnded]);

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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-welcome-title"
    >
      <div className="relative w-full max-w-2xl rounded-xl border bg-card p-5 shadow-xl">
        <div>
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            {CROS_ASSISTANT_NAME} · Welcome
          </p>
          <h2 id="agent-welcome-title" className="mt-1 text-lg font-semibold">
            Welcome to your agent portal
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {videoEnded
              ? 'You can replay this anytime from More → Support → Intro video.'
              : 'Please watch this short intro before continuing.'}
          </p>
        </div>
        <WelcomeVideoPlayer
          autoPlay
          lockUntilEnded
          className="mt-4"
          onEnded={() => setVideoEnded(true)}
        />
        {videoEnded ? (
          <div className="mt-5">
            <Button className="w-full" disabled={dismissing} onClick={() => void dismiss()}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
