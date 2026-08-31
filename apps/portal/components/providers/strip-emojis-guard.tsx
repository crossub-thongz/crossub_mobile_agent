'use client';

import { useEffect } from 'react';

import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { installGlobalEmojiFilter } from '@/lib/strip-emojis';

/** Blocks emoji in every text field on v2 only. Production v1 is unchanged. */
export function StripEmojisGuard() {
  const enabled = useIsAgentUiV2();
  useEffect(() => {
    if (!enabled) return;
    return installGlobalEmojiFilter();
  }, [enabled]);
  return null;
}
