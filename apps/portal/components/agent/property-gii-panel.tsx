'use client';

import { useEffect } from 'react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { useShellDockStore } from '@/lib/shell-dock-store';

/** Inline Gii on the property detail page (mobile only) — desktop uses the shell sidebar. */
export function PropertyGiiPanel({
  propertyId,
  propertyAddress,
}: {
  propertyId: string;
  propertyAddress: string;
}) {
  const openGii = useShellDockStore((s) => s.openGii);
  const clearGiiLaunch = useShellDockStore((s) => s.clearGiiLaunch);
  const closePanel = useShellDockStore((s) => s.closePanel);

  useEffect(() => {
    openGii({ propertyId, propertyAddress });
    return () => {
      clearGiiLaunch();
      closePanel();
    };
  }, [clearGiiLaunch, closePanel, openGii, propertyAddress, propertyId]);

  return (
    <section
      id="property-gii-panel"
      className="flex flex-col rounded-2xl border bg-card shadow-sm lg:hidden"
      aria-label="Gii property manager"
    >
      <GiiAssistant open variant="embedded" />
    </section>
  );
}
