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
 * One colour is kept: text the sender painted blue (Outlook's inline reply). `plainEmailBody`
 * wraps those runs in private-use marks. `MessageBody` paints the marks blue, and
 * `toPlainTextBody` strips them for previews, search, and assistants.
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

/**
 * Private-use sentinels around a blue inline reply. They are not HTML, so the plain-text
 * pipeline keeps them, and they never appear in a preview once `stripReplyMarks` runs.
 */
const REPLY_MARK_OPEN = '\uE000';
const REPLY_MARK_CLOSE = '\uE001';
const REPLY_MARK = /\uE000([\s\S]*?)\uE001/g;

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  windowtext: [0, 0, 0],
  blue: [0, 0, 255],
  mediumblue: [0, 0, 205],
  darkblue: [0, 0, 139],
  navy: [0, 0, 128],
  dodgerblue: [30, 144, 255],
  royalblue: [65, 105, 225],
  cornflowerblue: [100, 149, 237],
  deepskyblue: [0, 191, 255],
  steelblue: [70, 130, 180],
  lightblue: [173, 216, 230],
  skyblue: [135, 206, 235],
};

type Rgb = { r: number; g: number; b: number };

/** Drop the marks. Safe on text that never had any. */
export function stripReplyMarks(value: string): string {
  return value.replace(/\uE000|\uE001/g, '');
}

export type ReplyRun = { text: string; blue: boolean };

/** Split a display body into ordinary text and the sender's blue reply runs. */
export function splitReplyRuns(text: string): ReplyRun[] {
  if (!text.includes(REPLY_MARK_OPEN)) return [{ text, blue: false }];
  const runs: ReplyRun[] = [];
  const push = (part: string, blue: boolean) => {
    if (!part) return;
    const prev = runs[runs.length - 1];
    if (prev && prev.blue === blue) prev.text += part;
    else runs.push({ text: part, blue });
  };
  let last = 0;
  for (const match of text.matchAll(REPLY_MARK)) {
    const start = match.index ?? 0;
    if (start > last) push(stripReplyMarks(text.slice(last, start)), false);
    push(match[1] ?? '', true);
    last = start + match[0].length;
  }
  if (last < text.length) push(stripReplyMarks(text.slice(last)), false);
  return runs.length > 0 ? runs : [{ text: stripReplyMarks(text), blue: false }];
}

function parseCssColor(raw: string): Rgb | 'inherit' | null {
  const value = raw.trim().toLowerCase().replace(/\s*!important\s*$/, '').trim();
  if (!value || value === 'inherit' || value === 'currentcolor' || value === 'unset' || value === 'initial') {
    return 'inherit';
  }
  if (value === 'transparent') return { r: 0, g: 0, b: 0 };
  const named = NAMED_COLORS[value];
  if (named) return { r: named[0], g: named[1], b: named[2] };
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      return {
        r: Number.parseInt(h[0] + h[0], 16),
        g: Number.parseInt(h[1] + h[1], 16),
        b: Number.parseInt(h[2] + h[2], 16),
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: Number.parseInt(h.slice(0, 2), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        b: Number.parseInt(h.slice(4, 6), 16),
      };
    }
  }
  const bare = /^([0-9a-f]{6})$/i.exec(value);
  if (bare) {
    return {
      r: Number.parseInt(bare[1].slice(0, 2), 16),
      g: Number.parseInt(bare[1].slice(2, 4), 16),
      b: Number.parseInt(bare[1].slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(value);
  if (!rgb) return null;
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
}

/** Saturated blue, the colour Outlook uses for an inline reply. Black, grey, and teal stay off. */
function isReplyBlue(color: Rgb): boolean {
  const { r, g, b } = color;
  if (b < 100 || b < r + 30 || b < g) return false;
  return b - Math.max(r, g) >= 20;
}

function styleColorValue(styleValue: string): string | null {
  const color = /(?:^|;)\s*color\s*:\s*([^;!]+)/i.exec(styleValue);
  if (color) return color[1].trim();
  const mso = /mso-style-textfill-fill-color\s*:\s*([^;!]+)/i.exec(styleValue);
  return mso ? mso[1].trim() : null;
}

function quotedAttr(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i',
  ).exec(tag);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim() || null;
}

/** Class rules in a `<style>` block, for mail that colours a reply with a class instead of inline CSS. */
function replyBlueClasses(html: string): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const block of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const rule of block[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)\s*\{([^}]*)\}/g)) {
      const color = styleColorValue(rule[2]);
      if (!color) continue;
      const parsed = parseCssColor(color);
      if (parsed && parsed !== 'inherit') map.set(rule[1].toLowerCase(), isReplyBlue(parsed));
      else if (!parsed) map.set(rule[1].toLowerCase(), false);
    }
  }
  return map;
}

function declaredReplyBlue(tag: string, classBlue: Map<string, boolean>): boolean | undefined {
  const style = quotedAttr(tag, 'style');
  const inline = style ? styleColorValue(style) : null;
  if (inline) {
    const parsed = parseCssColor(inline);
    if (parsed === 'inherit') return undefined;
    if (!parsed) return false;
    return isReplyBlue(parsed);
  }
  if (/^<font\b/i.test(tag)) {
    const font = quotedAttr(tag, 'color');
    if (font) {
      const parsed = parseCssColor(font);
      if (parsed === 'inherit') return undefined;
      if (!parsed) return false;
      return isReplyBlue(parsed);
    }
  }
  if (classBlue.size === 0) return undefined;
  const names = (quotedAttr(tag, 'class') ?? '').split(/\s+/).filter(Boolean);
  let found: boolean | undefined;
  for (const name of names) {
    const value = classBlue.get(name.toLowerCase());
    if (value !== undefined) found = value;
  }
  return found;
}

/** Wrap blue text nodes so the later tag strip still knows which words were the reply. */
function markBlueReplyText(html: string): string {
  const classBlue = replyBlueClasses(html);
  const re = /<\/?([a-z][a-z0-9:-]*)\b[^>]*>/gi;
  let out = '';
  let last = 0;
  const stack: { tag: string; blue: boolean }[] = [];
  let blue = false;
  let skipping: string | null = null;

  const writeText = (text: string) => {
    if (!text) return;
    if (!skipping && blue && text.trim()) out += `${REPLY_MARK_OPEN}${text}${REPLY_MARK_CLOSE}`;
    else out += text;
  };

  for (const match of html.matchAll(re)) {
    const index = match.index ?? 0;
    writeText(html.slice(last, index));
    const full = match[0];
    const name = match[1].toLowerCase();
    const closing = full.startsWith('</');
    out += full;
    if (skipping) {
      if (closing && name === skipping) skipping = null;
    } else if (!closing && (name === 'script' || name === 'style')) {
      skipping = name;
    } else if (!closing && !full.endsWith('/>') && !VOID_TAGS.has(name)) {
      const declared = declaredReplyBlue(full, classBlue);
      stack.push({ tag: name, blue });
      if (declared !== undefined) blue = declared;
    } else if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag !== name) continue;
        blue = stack[i].blue;
        stack.length = i;
        break;
      }
    }
    last = index + full.length;
  }
  writeText(html.slice(last));
  return out;
}

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
  const line = stripReplyMarks(lines[index] ?? '').trim();
  if (!line) return false;
  if (WROTE_LINE.test(line) && (line.includes('@') || /\d/.test(line))) return true;
  if (ORIGINAL_MESSAGE.test(line) || FORWARDED_MESSAGE.test(line) || BEGIN_FORWARDED.test(line)) {
    return true;
  }
  if (/^_{8,}$/.test(line)) {
    const follow = stripReplyMarks(lines.slice(index + 1, index + 4).join('\n'));
    return /^From:/im.test(follow);
  }
  if (/^From:\s+/i.test(line) && line.includes('@')) {
    const next = lines
      .slice(index + 1, index + 4)
      .map((item) => stripReplyMarks(item).trim())
      .find((item) => item.length > 0);
    return Boolean(next && /^(?:Sent|Date):\s+/i.test(next));
  }
  return (
    line.startsWith('>') &&
    lines.slice(0, index).some((item) => {
      const text = stripReplyMarks(item).trim();
      return text.length > 0 && !text.startsWith('>');
    })
  );
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
 * Display text of every body copy on a message. Inbound mail sometimes stores the new
 * paragraph in `body` and the forwarded original — the application link — in another field.
 * A copy already contained in a longer one is dropped; the rest are kept, in field order.
 * Blue reply runs keep their marks; pass the result through `toPlainTextBody` for a preview.
 */
export function plainEmailBody(source: object | string | null | undefined): string {
  if (typeof source === 'string' || source == null) return toDisplayBody(source ?? '');
  const record = source as Record<string, unknown>;
  const pieces = RICH_BODY_FIELDS.flatMap((key) => {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) return [];
    const display = toDisplayBody(value).trim();
    const plain = stripReplyMarks(display);
    return plain ? [{ plain, display }] : [];
  });
  const kept: { plain: string; display: string }[] = [];
  for (const piece of pieces) {
    const index = kept.findIndex(
      (other) => other.plain.includes(piece.plain) || piece.plain.includes(other.plain),
    );
    if (index === -1) {
      kept.push(piece);
      continue;
    }
    const other = kept[index];
    if (other.plain.length > piece.plain.length && other.plain.includes(piece.plain)) continue;
    if (piece.plain.length > other.plain.length && piece.plain.includes(other.plain)) {
      kept[index] = piece;
      continue;
    }
    const pieceMarked = piece.display.includes(REPLY_MARK_OPEN);
    const otherMarked = other.display.includes(REPLY_MARK_OPEN);
    if (pieceMarked && !otherMarked) kept[index] = piece;
  }
  return kept.map((piece) => piece.display).join('\n\n');
}

/**
 * Same projection as `toPlainTextBody`, but blue reply runs keep their marks so the thread
 * can paint them. A body that is already plain (marks included) is returned unchanged.
 */
export function toDisplayBody(raw: string): string {
  if (!raw) return '';
  if (!looksLikeHtml(raw)) return raw.replace(CTA_INTRO_LINE, '').trim();

  const marked = markBlueReplyText(raw);
  const withoutCta = marked
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
    const visible = stripReplyMarks(text);
    const url = normalizeHttpUrl(hrefFromAttrs(attrs));
    if (!url || visible.includes(url)) return text || url || '';
    return text ? `${text} (${url})` : url;
  });

  const plain = decodeEntities(withLinks.replace(REMAINING_TAG, ''))
    .replace(/\r\n?/g, '\n')
    .replace(CTA_INTRO_LINE, '')
    .replace(TRAILING_SPACES, '')
    .replace(EXTRA_BLANK_LINES, '\n\n')
    .trim();

  // An Outlook button or an unquoted href never becomes an anchor the regex above keeps.
  const missing = hrefs.filter((url) => !stripReplyMarks(plain).includes(url));
  return missing.length > 0 ? `${plain}\n${missing.join('\n')}`.trim() : plain;
}

/** Plain text for previews, search, and assistants. Blue reply marks are removed. */
export function toPlainTextBody(raw: string): string {
  return stripReplyMarks(toDisplayBody(raw));
}
