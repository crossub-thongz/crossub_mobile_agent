import { inspectionsApi } from '@/lib/inspections-api';

export type DocumentPreviewKind = 'pdf' | 'image' | 'docx' | 'none';

/** Filed inspection PDFs use these ids. The documents file route 404s when no owned copy is stored. */
const INSPECTION_DOCUMENT_ID =
  /^(?:inspection-report|inspection):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function inspectionIdFromAgentDocumentId(
  documentId: string | null | undefined,
): string | null {
  const id = documentId?.trim();
  if (!id) return null;
  return INSPECTION_DOCUMENT_ID.exec(id)?.[1] ?? null;
}

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

/**
 * Preview and download href for a listed document.
 *
 * Inspection reports (`inspection-report:` / `inspection:`) are served by the inspection
 * report PDF route. That route files or generates the PDF, including routine reports that
 * have no row the agent documents file route can find. Uploaded portal files stay on the
 * documents proxy.
 */
export function agentDocumentPreviewHref(
  documentId: string | undefined | null,
  fallbackUrl?: string | null,
): string | undefined {
  const id = documentId?.trim();
  if (id) {
    const inspectionId = inspectionIdFromAgentDocumentId(id);
    if (inspectionId) return inspectionsApi.reportPdfUrl(inspectionId);
    return agentDocumentFileHref(id);
  }
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
  if (
    path.includes('register-agent-system-access-agreement') &&
    path.endsWith('/document')
  ) {
    return 'pdf';
  }
  if (path.includes('register-agent-service-agreement') && path.endsWith('/document')) {
    return 'pdf';
  }
  // Assume remote/API URLs without extension are PDFs (common for document storage).
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/api/')) {
    return 'pdf';
  }
  return 'none';
}
