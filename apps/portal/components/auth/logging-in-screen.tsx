'use client';

import { Loader2 } from 'lucide-react';

/** Shown over the login page, and anywhere a gate used to render nothing while auth settles. */
export function LoggingInScreen() {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#F6FCFC]/50 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-[#14B88D]" aria-hidden />
        <p className="text-sm font-medium text-[#0D1836]">Logging in...</p>
      </div>
    </div>
  );
}
