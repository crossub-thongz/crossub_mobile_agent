export type DocumentPreviewKind = 'pdf' | 'image' | 'docx' | 'none';

export function isViewableDocumentUrl(url?: string | null): url is string {
  if (!url || url === '#') return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('/')
  );
}

/**
 * Same-origin proxy for agent property/portal documents. Browser `fetch()` of public R2
 * URLs fails CORS; the API streams bytes at this path instead.
 */
export function agentDocumentFileHref(documentId: string): string {
  return `/api/v1/agent/documents/${encodeURIComponent(documentId)}/file`;
}

/** Prefer the authenticated file proxy when we have a stable document id. */
export function agentDocumentPreviewHref(
  documentId: string | undefined | null,
  fallbackUrl?: string | null,
): string | undefined {
  if (documentId?.trim()) return agentDocumentFileHref(documentId.trim());
  if (fallbackUrl && isViewableDocumentUrl(fallbackUrl)) return fallbackUrl;
  return undefined;
}

export function documentPreviewKindFromFileName(fileName: string): DocumentPreviewKind {
  const path = fileName.toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (/\.(docx?|word)$/i.test(path)) return 'docx';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return 'image';
  return 'none';
}

export function documentPreviewKind(url: string, fileName?: string): DocumentPreviewKind {
  if (fileName) {
    const fromName = documentPreviewKindFromFileName(fileName);
    if (fromName !== 'none') return fromName;
  }
  if (url.startsWith('blob:') && fileName) {
    return documentPreviewKindFromFileName(fileName);
  }
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.pdf') || url.startsWith('blob:')) return 'pdf';
  if (/\.(docx?|word)$/i.test(path)) return 'docx';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return 'image';
  // Registration / system-access document endpoints often omit a file extension.
  if (
    (path.includes('system-access-agreement') || path.includes('service-agreement')) &&
    path.endsWith('/document')
  ) {
    return 'pdf';
  }
  // Assume remote/API URLs without extension are PDFs (common for document storage).
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/api/')) {
    return 'pdf';
  }
  return 'none';
}
