'use client';

import Link from 'next/link';
import { Building2, ListChecks, MessageSquare, X } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { ROUTES, propertyNew } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';

export function WelcomeOnboarding() {
  const { user, status } = useAuth();
  const dismissed = useAgentStore((s) => s.onboardingDismissed);
  const dismiss = useAgentStore((s) => s.dismissOnboarding);

  if (status !== 'authed' || !user || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
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
            <ListChecks className="text-primary size-4 shrink-0" />
            <span>
              <strong>Status</strong> — every task with address + status
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
          <Button asChild onClick={dismiss}>
            <Link href={propertyNew()}>Add your first property</Link>
          </Button>
          <Button variant="outline" asChild onClick={dismiss}>
            <Link href={ROUTES.STATUS}>View task status</Link>
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={dismiss}>
            Got it — explore the app
          </Button>
        </div>
      </div>
    </div>
  );
}
