'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PlusSquare, Share, Smartphone, X } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute } from '@/constants/routes';
import {
  dismissAddToHomeScreenForSession,
  isAddToHomeScreenDismissedForSession,
} from '@/lib/add-to-home-screen-state';
import {
  isAndroid,
  isBeforeInstallPromptEvent,
  isIosSafari,
  isMobileUserAgent,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from '@/lib/add-to-home-screen';

export function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const { status } = useAuth();

  const bannerRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setDismissed(isAddToHomeScreenDismissedForSession());
  }, [status]);

  const dismiss = useCallback(() => {
    dismissAddToHomeScreenForSession();
    setDismissed(true);
  }, []);

  const shouldShow =
    status === 'authed' &&
    !dismissed &&
    !isPublicRoute(pathname) &&
    isMobileUserAgent() &&
    !isStandaloneDisplay();

  useEffect(() => {
    if (!shouldShow) {
      document.documentElement.style.removeProperty('--add-to-home-prompt-height');
      return;
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      if (isBeforeInstallPromptEvent(event)) {
        setInstallEvent(event);
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow || !bannerRef.current) {
      document.documentElement.style.removeProperty('--add-to-home-prompt-height');
      return;
    }

    const el = bannerRef.current;
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--add-to-home-prompt-height',
        `${el.offsetHeight + 8}px`,
      );
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--add-to-home-prompt-height');
    };
  }, [shouldShow]);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') dismiss();
    } catch {
      // ignore — user cancelled or browser blocked
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  }, [installEvent, dismiss]);

  if (!shouldShow) return null;

  const ios = isIosSafari();
  const android = isAndroid();
  const canNativeInstall = !!installEvent;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 top-[calc(var(--shell-header-height,3.5rem)+env(safe-area-inset-top)+var(--env-banner-height,0px))] z-[90] flex justify-center px-3 lg:hidden"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-primary/30 bg-card p-3 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <Smartphone className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-primary text-[10px] font-semibold tracking-wider uppercase">
                  Install app
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug">Add to Home Screen</p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1 hover:bg-secondary"
                aria-label="Dismiss add to home screen prompt"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {canNativeInstall
                ? 'Install CROSSUB Agent for quick access from your home screen — like a native app.'
                : ios
                  ? 'Tap Share, then View More, then Add to Home Screen for one-tap access to your portal.'
                  : 'Add CROSSUB Agent to your home screen for faster access and a full-screen experience.'}
            </p>
            {ios && !canNativeInstall ? (
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <Share className="size-3.5 shrink-0" aria-hidden />
                <span>
                  Share <span className="text-foreground font-medium">→</span> View More{' '}
                  <span className="text-foreground font-medium">→</span> Add to Home Screen
                </span>
              </p>
            ) : null}
            {android && !canNativeInstall ? (
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <PlusSquare className="size-3.5 shrink-0" aria-hidden />
                <span>
                  Browser menu <span className="text-foreground font-medium">→</span> Install app / Add
                  to Home screen
                </span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {canNativeInstall ? (
                <Button size="sm" className="h-8 text-xs" disabled={installing} onClick={() => void handleInstall()}>
                  {installing ? 'Installing…' : 'Install now'}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={canNativeInstall ? 'outline' : 'default'}
                className="h-8 text-xs"
                onClick={dismiss}
              >
                {canNativeInstall ? 'Not now' : 'Got it'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
