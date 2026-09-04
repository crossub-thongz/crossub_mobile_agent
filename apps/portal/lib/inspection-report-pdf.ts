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

async function fetchReportBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

/** Load a PDF for in-app preview — prefers a blob URL so the browser renders inline. */
export async function loadInspectionReportPreviewUrl(url: string): Promise<string> {
  const blob = await fetchReportBlob(url);
  if (blob) return URL.createObjectURL(blob);
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
  const blob = await fetchPdf(inspectionId);
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
): Promise<string> {
  const blob = await fetchPdf(inspectionId);
  return URL.createObjectURL(blob);
}

export function revokeInspectionReportBlobUrl(objectUrl: string | null | undefined): void {
  if (objectUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Chrome/Edge PDF embed params — hide side panes, fit page width to the iframe. */
export function inspectionReportPdfEmbedSrc(url: string): string {
  const base = url.split('#')[0] ?? url;
  return `${base}#navpanes=0&toolbar=1&scrollbar=1&view=FitH`;
}
