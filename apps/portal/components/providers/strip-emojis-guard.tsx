'use client';

import { useEffect } from 'react';

import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  AGENT_INPUT_FILTER_REVISION,
  installGlobalAgentInputFilter,
} from '@/lib/strip-emojis';

/**
 * Enforces Agent App input rules on every text field: no HTML, kind max-length /
 * line-breaks when tagged, and v2 emoji-strip for unclassified fields.
 */
export function StripEmojisGuard() {
  const stripEmojiByDefault = useIsAgentUiV2();
  useEffect(() => {
    return installGlobalAgentInputFilter({ stripEmojiByDefault });
  }, [stripEmojiByDefault, AGENT_INPUT_FILTER_REVISION]);
  return null;
}
