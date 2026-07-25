/** Minimal HTML conversion for sent-email previews — mirrors API mixedTextToEmailHtml. */

const HTML_TAG_PATTERN = /<\/?[a-z][\w-]*\b[^>]*>/i;

const PRESERVED_HTML_FRAGMENT_SOURCE = String.raw`<p\b[^>]*>[\s\S]*?<\/p>|<a\b[^>]*>[\s\S]*?<\/a>|<(strong|em|b|i|u|span)\b[^>]*>[\s\S]*?<\/\1>|<\/?[a-z][\w-]*\b[^>]*\/?>`;

export function containsHtmlMarkup(text: string): boolean {
  return HTML_TAG_PATTERN.test(text);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMixedParagraphToHtml(para: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  const re = new RegExp(PRESERVED_HTML_FRAGMENT_SOURCE, 'gi');
  let match: RegExpExecArray | null;

  while ((match = re.exec(para)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        escapeHtml(para.slice(lastIndex, match.index)).replace(/\n/g, '<br/>'),
      );
    }
    parts.push(match[0]!);
    lastIndex = match.index + match[0]!.length;
  }

  if (lastIndex < para.length) {
    parts.push(escapeHtml(para.slice(lastIndex)).replace(/\n/g, '<br/>'));
  }

  return parts.join('');
}

function plainFragmentToEmailHtml(text: string): string {
  if (!text.trim()) return '';

  return text
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      if (containsHtmlMarkup(trimmed)) {
        return `<p style="margin:0 0 1em 0;">${inlineMixedParagraphToHtml(trimmed)}</p>`;
      }
      return `<p style="margin:0 0 1em 0;">${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function mixedTextToEmailHtml(bodyText: string): string {
  if (!containsHtmlMarkup(bodyText)) {
    return plainFragmentToEmailHtml(bodyText);
  }

  return bodyText
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      return `<p style="margin:0 0 1em 0;">${inlineMixedParagraphToHtml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}
