import {
  GII_PENDING_TEXT,
  GII_SUMMARISE_MAX_MESSAGES,
  GII_SUMMARY_FOLD_AT,
  GII_SUMMARY_KEEP_RECENT,
} from '@/constants/gii-conversation';
import type { GiiTranscriptLine } from '@/utils/gii-conversation';
import { truncateGiiChatContent } from '@/utils/gii-chat-content';

/**
 * A chat's older lines, folded into notes (Jarvis 1.2). `through` lines from the start are
 * covered; `anchorId` is the chat's first line, so notes from another chat are never used.
 */
export type GiiEarlierSummary = {
  text: string;
  through: number;
  anchorId: string;
};

export type GiiSummaryFold = {
  summary?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  through: number;
  anchorId: string;
};

/** The notes that belong to this chat, or null when it has none. */
export function giiEarlierSummaryFor(
  lines: GiiTranscriptLine[],
  earlier: GiiEarlierSummary | null,
): GiiEarlierSummary | null {
  if (!earlier || !lines.length || lines[0].id !== earlier.anchorId) return null;
  return earlier.through <= lines.length ? earlier : null;
}

/** The lines the notes do not cover, which still go to the chat word for word. */
export function giiLinesAfterSummary<T extends GiiTranscriptLine>(
  lines: T[],
  earlier: GiiEarlierSummary | null,
): T[] {
  return lines.slice(giiEarlierSummaryFor(lines, earlier)?.through ?? 0);
}

/**
 * The next fold, or null while a turn is in flight or the uncovered lines still fit.
 * Takes at most `GII_SUMMARISE_MAX_MESSAGES` lines; a reopened long chat folds in steps.
 */
export function giiNextSummaryFold(
  lines: GiiTranscriptLine[],
  earlier: GiiEarlierSummary | null,
): GiiSummaryFold | null {
  if (!lines.length || lines.some((line) => line.pending)) return null;
  const current = giiEarlierSummaryFor(lines, earlier);
  const from = current?.through ?? 0;
  if (lines.length - from <= GII_SUMMARY_FOLD_AT) return null;
  const through = Math.min(lines.length - GII_SUMMARY_KEEP_RECENT, from + GII_SUMMARISE_MAX_MESSAGES);
  const messages = lines
    .slice(from, through)
    .filter((line) => line.text.trim() && line.text !== GII_PENDING_TEXT)
    .map((line) => ({ role: line.role, content: truncateGiiChatContent(line.text) }));
  if (!messages.length) return null;
  return {
    ...(current ? { summary: current.text } : {}),
    messages,
    through,
    anchorId: lines[0].id,
  };
}
