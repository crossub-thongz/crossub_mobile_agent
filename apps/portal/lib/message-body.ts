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
const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_ATTR = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
/** A real tag. `<name@email>` is an address, not markup, so `@` cannot start the rest of the name. */
const REMAINING_TAG = /<\/?[a-z][a-z0-9:-]*(?:\s[^<>]*)?\/?>/gi;
/** A URL in plain text, including a bare `www.` host. Trailing punctuation is trimmed later. */
const URL_IN_TEXT = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
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

function hrefFromAttrs(attrs: string): string {
  const match = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs);
  return decodeEntities((match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim());
}

/** Drop a trailing sentence mark that the URL regex swallowed. Keep a balanced `)`. */
function trimUrlTail(raw: string): string {
  let url = raw;
  while (/[),.;:!?]$/.test(url)) {
    if (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) === (url.match(/\)/g)?.length ?? 0)) break;
    url = url.slice(0, -1);
  }
  return url;
}

/** `https://…` as itself; `www.…` with a scheme so it can be opened. Anything else is not a link. */
export function normalizeHttpUrl(raw: string): string | null {
  const url = trimUrlTail(decodeEntities(raw).trim());
  if (/^https?:\/\//i.test(url)) return url;
  if (/^www\./i.test(url)) return `https://${url}`;
  return null;
}

function uniqueHttpUrls(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const url = normalizeHttpUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** Every openable link in already-plain email text, in reading order. */
export function httpLinks(text: string): string[] {
  return uniqueHttpUrls(text.match(URL_IN_TEXT) ?? []);
}

export type TextSpan = { text: string; href?: string };

/** Split plain text into runs, with each URL marked so the bubble can open it. */
export function linkSpans(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const start = match.index ?? 0;
    const href = normalizeHttpUrl(match[0]);
    if (!href || start < last) continue;
    const visible = trimUrlTail(match[0]);
    if (start > last) spans.push({ text: text.slice(last, start) });
    spans.push({ text: visible, href });
    last = start + visible.length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length > 0 ? spans : [{ text }];
}

const WROTE_LINE = /^On .+ wrote:\s*$/i;
const ORIGINAL_MESSAGE = /^-{3,}\s*Original Message\s*-{3,}\s*$/i;
const FORWARDED_MESSAGE = /^-{3,}\s*Forwarded message\s*-{3,}\s*$/i;
const BEGIN_FORWARDED = /^Begin forwarded message:\s*$/i;

function isQuoteMarker(lines: readonly string[], index: number): boolean {
  const line = lines[index]?.trim() ?? '';
  if (!line) return false;
  if (WROTE_LINE.test(line) && (line.includes('@') || /\d/.test(line))) return true;
  if (ORIGINAL_MESSAGE.test(line) || FORWARDED_MESSAGE.test(line) || BEGIN_FORWARDED.test(line)) {
    return true;
  }
  if (/^_{8,}$/.test(line)) {
    const follow = lines.slice(index + 1, index + 4).join('\n');
    return /^From:/im.test(follow);
  }
  if (/^From:\s+/i.test(line) && line.includes('@')) {
    const next = lines
      .slice(index + 1, index + 4)
      .map((item) => item.trim())
      .find((item) => item.length > 0);
    return Boolean(next && /^(?:Sent|Date):\s+/i.test(next));
  }
  return line.startsWith('>') && lines.slice(0, index).some((item) => item.trim() && !item.trim().startsWith('>'));
}

/**
 * The new note, and the forwarded original beneath it. A body with no marker stays one piece,
 * so a short mail is never hidden. The caller still lists links from the quoted part.
 */
export function splitQuotedHistory(plain: string): { reply: string; quoted: string } {
  const lines = plain.split('\n');
  const cut = lines.findIndex((_, index) => isQuoteMarker(lines, index));
  if (cut <= 0) return { reply: plain.trim(), quoted: '' };
  const reply = lines.slice(0, cut).join('\n').trim();
  const quoted = lines.slice(cut).join('\n').trim();
  if (!reply || !quoted) return { reply: plain.trim(), quoted: '' };
  return { reply, quoted };
}

const RICH_BODY_FIELDS = ['body', 'bodyHtml', 'html', 'htmlBody', 'quotedBody', 'quotedHtml'] as const;

/**
 * Plain text of every body copy on a message. Inbound mail sometimes stores the new
 * paragraph in `body` and the forwarded original — the application link — in another field.
 * A copy already contained in a longer one is dropped; the rest are kept, in field order.
 */
export function plainEmailBody(source: object | string | null | undefined): string {
  if (typeof source === 'string' || source == null) return toPlainTextBody(source ?? '');
  const record = source as Record<string, unknown>;
  const plains = RICH_BODY_FIELDS.flatMap((key) => {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) return [];
    const plain = toPlainTextBody(value).trim();
    return plain ? [plain] : [];
  });
  const kept = plains.filter(
    (plain, index) => !plains.some((other, otherIndex) => otherIndex !== index && other.includes(plain)),
  );
  return kept.join('\n\n');
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

  const hrefs = uniqueHttpUrls(
    [...withoutCta.matchAll(HREF_ATTR)].map((match) => match[1] ?? match[2] ?? match[3] ?? ''),
  );

  const withLinks = withBreaks.replace(ANCHOR, (_match, attrs: string, label: string) => {
    const text = decodeEntities(label.replace(REMAINING_TAG, '')).trim();
    const url = normalizeHttpUrl(hrefFromAttrs(attrs));
    if (!url || text.includes(url)) return text || url || '';
    return text ? `${text} (${url})` : url;
  });

  const plain = decodeEntities(withLinks.replace(REMAINING_TAG, ''))
    .replace(/\r\n?/g, '\n')
    .replace(CTA_INTRO_LINE, '')
    .replace(TRAILING_SPACES, '')
    .replace(EXTRA_BLANK_LINES, '\n\n')
    .trim();

  // An Outlook button or an unquoted href never becomes an anchor the regex above keeps.
  const missing = hrefs.filter((url) => !plain.includes(url));
  return missing.length > 0 ? `${plain}\n${missing.join('\n')}`.trim() : plain;
}
