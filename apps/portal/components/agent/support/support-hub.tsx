'use client';

import { MoreSectionCard } from '@/components/agent/more/more-hub';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { SUPPORT_PAGE_SECTION } from '@/constants/more-page';
import { cn } from '@/lib/utils';

import '@/components/agent/more/more-hub.css';

export function SupportHub() {
  const isV2 = useIsAgentUiV2();

  return (
    <div className={cn('more-hub', isV2 && 'v2-dashboard normal-case')}>
      <header className={cn('more-hub__intro', isV2 && 'pt-2 lg:pt-6')}>
        <h1 className={cn('text-2xl font-semibold tracking-tight', isV2 && 'v2-dashboard__greeting')}>
          Support
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Intro video, contact, help centre and system status.
        </p>
      </header>

      <div className="mt-6 max-w-2xl">
        <MoreSectionCard
          section={SUPPORT_PAGE_SECTION}
          expanded
          onToggle={() => undefined}
          collapsible={false}
        />
      </div>
    </div>
  );
}
