/**
 * The Conversations reply editor's HTML, kept in step with the admin portal's composer
 * (`crossub_web/apps/web/utils/comm-email-html.ts`). The API sanitises `bodyHtml` to bare
 * formatting tags and `href` on links; trimming the same things here only keeps a pasted
 * email under the length cap and makes the editor show what the recipient gets.
 */

/** Elements dropped together with everything inside them — never visible in the email. */
const DROP_WITH_CONTENT = ['style', 'script', 'head', 'title', 'xml', 'svg'] as const;

/** Void / metadata tags dropped on their own (no closing tag to pair with). */
const DROP_TAG_ONLY = ['meta', 'link', 'img'] as const;

const COMMENT = /<!--[\s\S]*?-->/g;
/** Office's `<![if …]>` / `<![endif]>`, CDATA, `<!DOCTYPE>` and `<?xml?>` — never content. */
const DECLARATION = /<!\[[\s\S]*?\]>|<[!?][^>]*>/g;
/** A comment that already reached an inbox as text and was copied back from there. */
const ESCAPED_COMMENT = /&(?:amp;)*lt;!--[^<>]*?--(?:&(?:amp;)*gt;|>)/gi;
const ANY_TAG = /<(\/?)([a-zA-Z][\w:-]*)\b[^>]*>/g;
const HREF_ATTR = /\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i;
const ANCHOR_TAG = 'a';

/** Browsers wrap copied HTML in a document and mark the copied part with these comments. */
const FRAGMENT = /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i;
const DOCUMENT_WRAPPER = /<\/?(html|body)\b[^>]*>/gi;

/** Escape plain text for the editor's HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Plain text (with newlines) → the HTML the editor holds, newlines as `<br>`. */
export function textToEditorHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

/** Drop every attribute but a link's `href`, and everything an email never shows. */
export function compactComposerHtml(html: string): string {
  let out = html.replace(COMMENT, '').replace(DECLARATION, '').replace(ESCAPED_COMMENT, '');
  for (const tag of DROP_WITH_CONTENT) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi'), '');
  }
  for (const tag of DROP_TAG_ONLY) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
  }
  return out.replace(ANY_TAG, (match, closing: string, rawName: string) => {
    const name = rawName.toLowerCase();
    if (closing) return `</${name}>`;
    if (name !== ANCHOR_TAG) return `<${name}>`;
    const href = match.match(HREF_ATTR);
    return href ? `<a href=${href[1]}>` : '<a>';
  });
}

/** What a paste puts into the editor: one font and size, keeping bold, lists and links. */
export function pastedHtmlToComposerHtml(html: string): string {
  const fragment = html.match(FRAGMENT)?.[1] ?? html;
  return compactComposerHtml(fragment).replace(DOCUMENT_WRAPPER, '').trim();
}

/**
 * Insert HTML at the caret inside a `contentEditable`, replacing any selection, and leave the
 * caret after it. Returns false when the caret is not inside `root`, so the caller can append.
 */
export function insertHtmlAtSelection(root: HTMLElement, html: string): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return true;
}
