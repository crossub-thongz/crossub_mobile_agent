'use client';

import { useEffect } from 'react';

import { installGlobalEmojiFilter } from '@/lib/strip-emojis';

/** Blocks emoji in every text field (Input, Textarea, and native inputs). */
export function StripEmojisGuard() {
  useEffect(() => installGlobalEmojiFilter(), []);
  return null;
}
