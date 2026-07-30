/**
 * Normalise API-authored message/notification bodies for display.
 *
 * The API composes conversation and notification bodies as *email* bodies: mostly plain text,
 * but with an inline HTML portal CTA button appended at send time (`emailCtaButton` in
 * `crossub_web`). Rendering that verbatim leaks markup like
 * `<p style="…"><a href="…" class="crossub-email-cta" …>Open Tenant (Mobile)</a></p>` into the
 * thread — which is exactly what an officer saw on maintenance case MR-00112 in the staff
 * console. This app renders text, not HTML, so every body passes through `toPlainTextBody` in
 * `lib/crossub-api/agent-mappers.ts` before it reaches a screen.
 *
 * The portal CTA is dropped entirely: it is always a button to a role app's *root*, carrying no
 * per-recipient token and nothing an agent reading the thread can act on. Every other link
 * survives as `label (url)` text — a one-job upload link or a document link is the whole point
 * of the message it sits in.
 *
 * Ported from the tenant app (`crossub_mobile_tenant/apps/tenant/lib/message-body.ts`); keep the
 * two in step.
 */
import {
  EMAIL_CTA_MARKER,
  HTML_BLOCK_TAGS,
  HTML_NAMED_ENTITIES,
} from '@/constants/email-body';

/** `<p …><a class="crossub-email-cta" …>Open Tenant (Mobile)</a></p>` — the whole CTA block. */
const CTA_PARAGRAPH = new RegExp(
  `<p\\b[^>]*>\\s*<a\\b[^>]*${EMAIL_CTA_MARKER}[^>]*>[\\s\\S]*?<\\/a>\\s*<\\/p>`,
  'gi',
);

/** A bare CTA anchor (older bodies were not wrapped in a paragraph). */
const CTA_ANCHOR = new RegExp(
  `<a\\b[^>]*${EMAIL_CTA_MARKER}[^>]*>[\\s\\S]*?<\\/a>`,
  'gi',
);

/** The "Click below to open Tenant (Mobile):" line the API writes above the CTA. */
const CTA_INTRO_LINE =
  /^[ \t]*(?:click below to open|open the (?:tenant|landlord|inspector|agent) portal)[^\n]*$/gim;

const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const LINE_BREAK = /<br\s*\/?>/gi;
const BLOCK_CLOSE = new RegExp(`</(?:${HTML_BLOCK_TAGS.join('|')})\\s*>`, 'gi');
const LIST_ITEM_OPEN = /<li\b[^>]*>/gi;
const ANCHOR = /<a\b[^>]*?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
const REMAINING_TAG = /<\/?[a-z][^>]*>/gi;
const NAMED_ENTITY = /&([a-z]+);/gi;
const NUMERIC_ENTITY = /&#(x?)([0-9a-f]+);/gi;
const TRAILING_SPACES = /[ \t]+$/gm;
const EXTRA_BLANK_LINES = /\n{3,}/g;

/** Cheap guard — bodies without markup or entities are already plain text. */
function looksLikeHtml(value: string): boolean {
  return value.includes('<') || value.includes('&');
}

function decodeEntities(value: string): string {
  return value
    .replace(NUMERIC_ENTITY, (match, hex: string, code: string) => {
      const point = Number.parseInt(code, hex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    })
    .replace(NAMED_ENTITY, (match, name: string) => {
      const decoded = HTML_NAMED_ENTITIES[name.toLowerCase()];
      return decoded ?? match;
    });
}

/**
 * Project an email-shaped body onto readable plain text: drop the portal CTA, turn block
 * tags into line breaks, keep link text (with its URL when it adds information), decode
 * entities. Newlines are preserved — render with `whitespace-pre-wrap`.
 */
export function toPlainTextBody(raw: string): string {
  if (!raw) return '';
  if (!looksLikeHtml(raw)) return raw.replace(CTA_INTRO_LINE, '').trim();

  const withoutCta = raw
    .replace(SCRIPT_OR_STYLE, '')
    .replace(CTA_PARAGRAPH, '\n')
    .replace(CTA_ANCHOR, '');

  const withBreaks = withoutCta
    .replace(LINE_BREAK, '\n')
    .replace(BLOCK_CLOSE, '\n')
    .replace(LIST_ITEM_OPEN, '• ');

  const withLinks = withBreaks.replace(
    ANCHOR,
    (_match, href: string, label: string) => {
      const text = decodeEntities(label.replace(REMAINING_TAG, '')).trim();
      const url = decodeEntities(href).trim();
      if (!url || url.startsWith('mailto:') || text.includes(url)) return text || url;
      return text ? `${text} (${url})` : url;
    },
  );

  return decodeEntities(withLinks.replace(REMAINING_TAG, ''))
    .replace(/\r\n?/g, '\n')
    .replace(CTA_INTRO_LINE, '')
    .replace(TRAILING_SPACES, '')
    .replace(EXTRA_BLANK_LINES, '\n\n')
    .trim();
}
