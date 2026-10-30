'use client';

import { Check, House, Loader2 } from 'lucide-react';

const AGENT_GREEN = '#00bd85';

export function RegisterReadyStep({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: () => void;
}) {
  return (
    <div className="mt-2 grid items-center gap-6 sm:grid-cols-2">
      <div>
        <span className="grid size-16 place-items-center rounded-full bg-[#E7FBF4] text-[#00bd85]">
          <Check className="size-7" strokeWidth={2.5} />
        </span>
        <p className="mt-5 w-fit rounded-full bg-[#E7FBF4] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#00bd85]">
          FREE WORKSPACE READY
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Welcome to Crossub!</h2>
        <p className="mt-2 text-sm leading-6 text-[#52647C]">
          Your registration preview is complete. Here&apos;s what your new workspace could look like.
        </p>
      </div>

      <div>
      <div className="rounded-[16px] border border-[#B7EBD6] bg-[#F3FCF8] p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0D1836]">
            <House className="size-4 text-[#00bd85]" aria-hidden />
            Free Software + Cros AI
          </p>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#00bd85]">
            Recommended
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#52647C]">
          Manage your properties in one intelligent workspace. No paid service selection required.
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={onStart}
        className="mt-6 inline-flex h-[50px] w-full items-center justify-center rounded-[9px] text-sm font-semibold text-white disabled:opacity-70"
        style={{ backgroundColor: AGENT_GREEN }}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Starting...
          </>
        ) : (
          'Start your trip'
        )}
      </button>
      </div>
    </div>
  );
}
