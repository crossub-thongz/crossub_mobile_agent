import '@/components/agent/dashboard/v2-dashboard.css';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Auth form panel — frosted on v2 so it is not a solid white card. */
export function authPanelClass(isV2: boolean, className?: string) {
  return cn(
    'w-full rounded-xl border p-8 shadow-lg',
    isV2 ? 'v2-frosted-surface rounded-lg p-6 shadow-none' : 'bg-card',
    className,
  );
}

/**
 * Login / register canvas. Outer node carries the mint wash; inner node keeps
 * flex layout so absolutely positioned chrome (theme toggle) still works.
 */
export function AuthScreen({
  isV2,
  className,
  children,
}: {
  isV2: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative min-h-screen bg-background', isV2 && 'v2-dashboard-canvas')}>
      <div
        className={cn(
          'relative z-[1] flex min-h-screen flex-col items-center justify-center px-4 py-8',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
