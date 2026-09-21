import { fetchApiBlobFromUrl } from '@/lib/api';
import { agentDocumentFileHref } from '@/lib/document-preview';

/** Slug for a safe download filename segment. */
function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function buildInspectionReportFilename(
  property: string,
  inspectionType: 'ingoing' | 'outgoing' | 'routine' | 'open',
): string {
  const prefix =
    inspectionType === 'ingoing' || inspectionType === 'outgoing'
      ? inspectionType
      : 'inspection';
  return `${prefix}-report-${slug(property) || 'property'}.pdf`;
}

async function asPdfBlob(blob: Blob): Promise<Blob> {
  const bytes = blob.type === 'application/pdf' ? null : await blob.arrayBuffer();
  const typed =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([bytes!], { type: 'application/pdf' });
  if (typed.size < 5) throw new Error('Report file is empty');
  return typed;
}

function isSameOriginUrl(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function isApiProxyPath(url: string): boolean {
  return url.startsWith('/api/') || url.startsWith('/api/v1/');
}

async function fetchReportBlob(url: string): Promise<Blob | null> {
  try {
    if (isApiProxyPath(url)) {
      return await asPdfBlob(await fetchApiBlobFromUrl(url));
    }
    const response = await fetch(url, {
      credentials: isSameOriginUrl(url) ? 'include' : 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await asPdfBlob(await response.blob());
  } catch {
    return null;
  }
}

async function blobToObjectUrl(blob: Blob): Promise<string> {
  const typed = await asPdfBlob(blob);
  return URL.createObjectURL(typed);
}

async function blobLooksLikeOpenInspectionReport(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.slice(0, 512_000).arrayBuffer());
  let sample = '';
  for (const byte of bytes) sample += String.fromCharCode(byte);
  return /Open Inspection Report|Check list before open inspection/i.test(sample);
}

/** Load a PDF for in-app preview — prefers a blob URL so the browser renders inline. */
export async function loadInspectionReportPreviewUrl(
  url: string,
  inspectionType?: 'ingoing' | 'outgoing' | 'routine' | 'open' | null,
): Promise<string> {
  const blob = await fetchReportBlob(url);
  if (blob) {
    if (
      inspectionType &&
      inspectionType !== 'open' &&
      (await blobLooksLikeOpenInspectionReport(blob))
    ) {
      throw new Error('Open inspection PDF cannot preview a routine report');
    }
    return URL.createObjectURL(blob);
  }
  // Same-origin API/proxy misses must fail so the preview can try the next source.
  // Cross-origin R2 URLs fail `fetch` on CORS; the iframe can still render them.
  if (isSameOriginUrl(url)) {
    throw new Error('Report file is not available');
  }
  if (inspectionType && inspectionType !== 'open') {
    throw new Error('Report file is not available');
  }
  return url;
}

export function revokeInspectionReportPreviewUrl(objectUrl: string, sourceUrl: string): void {
  if (objectUrl.startsWith('blob:') && objectUrl !== sourceUrl) {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadInspectionReportPdf(
  url: string,
  filename: string,
): Promise<void> {
  const blob = await fetchReportBlob(url);
  if (blob) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadInspectionReportFromApi(
  inspectionId: string,
  filename: string,
  fetchPdf: (id: string) => Promise<Blob>,
): Promise<void> {
  const blob = await asPdfBlob(await fetchPdf(inspectionId));
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Load a PDF blob from the staff report endpoint for in-app preview. */
export async function loadInspectionReportPreviewFromApi(
  inspectionId: string,
  fetchPdf: (id: string) => Promise<Blob>,
  inspectionType?: 'ingoing' | 'outgoing' | 'routine' | 'open' | null,
): Promise<string> {
  const blob = await asPdfBlob(await fetchPdf(inspectionId));
  if (
    inspectionType &&
    inspectionType !== 'open' &&
    (await blobLooksLikeOpenInspectionReport(blob))
  ) {
    throw new Error('Open inspection PDF cannot preview a routine report');
  }
  return blobToObjectUrl(blob);
}

export function revokeInspectionReportBlobUrl(objectUrl: string | null | undefined): void {
  if (objectUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Chrome's PDF viewer treats `#navpanes` on blob URLs as a broken document.
 * Keep hash params on http(s) URLs only.
 */
export function inspectionReportPdfEmbedSrc(url: string): string {
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  const base = url.split('#')[0] ?? url;
  return `${base}#navpanes=0&toolbar=1&scrollbar=1&view=FitH`;
}

/**
 * Stored report URLs that belong to this inspection. Open-inspection PDFs must
 * not fill a routine/ingoing/outgoing preview.
 */
export function isSafeInspectionReportFallbackUrl(
  url: string,
  inspectionId?: string | null,
  inspectionType?: 'ingoing' | 'outgoing' | 'routine' | 'open' | null,
): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/(?:^|\/)open-inspection-reports\//i.test(trimmed) || /open[-_ ]inspection/i.test(trimmed)) {
    return inspectionType === 'open';
  }
  const owner = /(?:^|\/)inspection-reports\/([0-9a-fA-F-]{36})(?:\/|$)/.exec(trimmed)?.[1];
  if (owner && inspectionId) {
    return owner.toLowerCase() === inspectionId.toLowerCase();
  }
  return true;
}

/**
 * Authenticated preview sources for one inspection, in order: generated/filed
 * PDF endpoint, then the agent document proxy (filed portal/media PDF).
 */
export function inspectionReportAuthenticatedPreviewHrefs(inspectionId: string): string[] {
  return [
    agentDocumentFileHref(`inspection-report:${inspectionId}`),
    agentDocumentFileHref(`inspection:${inspectionId}`),
  ];
}
