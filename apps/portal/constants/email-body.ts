/**
 * Constants for the email-shaped bodies the API stores on conversations and notifications.
 * Those bodies are plain text with occasional inline HTML (the send-time portal CTA button),
 * so the app has to normalise them before rendering — see `lib/message-body.ts`.
 *
 * Keep in sync with `crossub_web` → `apps/api/src/common/utils/email-cta.util.ts`, and with the
 * identical pair in the tenant app (`crossub_mobile_tenant`), which this is ported from.
 */

/** Class the API stamps on portal CTA buttons (`emailCtaButton`). */
export const EMAIL_CTA_MARKER = 'crossub-email-cta';

/** Block-level tags whose close means "start a new line" in the plain-text projection. */
export const HTML_BLOCK_TAGS = [
  'p',
  'div',
  'li',
  'tr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
] as const;

/** Named HTML entities that show up in API-authored bodies. */
export const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};
