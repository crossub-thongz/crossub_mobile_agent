'use client';

import { Sparkles } from 'lucide-react';

import { PORTFOLIO_GII_PROMPTS } from '@/constants/gii-prompts';
import { useShellDockStore } from '@/lib/shell-dock-store';

export function GiiPortfolioBanner() {
  const openGii = useShellDockStore((s) => s.openGii);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-4 md:hidden">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Gii · Your Property Manager</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Open a property from your phone book, then ask Gii to create maintenance, inspections,
            or leasing — or add a new listing here.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PORTFOLIO_GII_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openGii({ initialPrompt: item.prompt })}
                className="rounded-full border border-primary/25 bg-background/80 px-2.5 py-1 text-[11px] font-medium transition hover:bg-primary/10"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => openGii()}
              className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm"
            >
              Chat with Gii
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
