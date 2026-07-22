'use client';

import { useEffect } from 'react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { useShellDockStore } from '@/lib/shell-dock-store';

/** Inline Gii on the property detail page — chat on top, text/voice input at bottom. */
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
  const setPropertyGiiInlineActive = useShellDockStore((s) => s.setPropertyGiiInlineActive);

  useEffect(() => {
    setPropertyGiiInlineActive(true);
    openGii({ propertyId, propertyAddress });
    return () => {
      setPropertyGiiInlineActive(false);
      clearGiiLaunch();
      closePanel();
    };
  }, [
    clearGiiLaunch,
    closePanel,
    openGii,
    propertyAddress,
    propertyId,
    setPropertyGiiInlineActive,
  ]);

  return (
    <section
      id="property-gii-panel"
      className="flex min-h-[min(70vh,640px)] flex-col rounded-2xl border bg-card shadow-sm"
      aria-label="Gii property manager"
    >
      <GiiAssistant open variant="embedded" />
    </section>
  );
}
