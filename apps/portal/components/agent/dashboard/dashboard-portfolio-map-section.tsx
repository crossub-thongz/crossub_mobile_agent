'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const SECTION_TITLE_CLASS = 'text-sm font-semibold lg:text-base';

export function DashboardPortfolioMapSection({ properties }: { properties: Property[] }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 py-1"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
      >
        <h2 className={SECTION_TITLE_CLASS}>Portfolio map</h2>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            collapsed && '-rotate-90',
          )}
        />
      </button>

      {!collapsed ? (
        <div className="w-full">
          <DashboardPropertiesMap
            properties={properties}
            embedded
            showStats
            dashboardTile
          />
        </div>
      ) : null}
    </section>
  );
}
