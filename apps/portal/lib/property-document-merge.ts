import type { UploadedDocumentLike } from '@/lib/property-create-document-groups';

/** System-generated inspection reports (ingoing/outgoing, etc.) carry this marker. */
export const SYSTEM_GENERATED_REPORT_MARKER = '_SG';

export function markSystemGeneratedReportName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes(SYSTEM_GENERATED_REPORT_MARKER)) return trimmed;
  return `${trimmed}${SYSTEM_GENERATED_REPORT_MARKER}`;
}

function parseInspectionIdFromDocumentId(id: string): string | undefined {
  if (id.startsWith('inspection-report:')) return id.slice('inspection-report:'.length);
  if (id.startsWith('inspection:')) return id.slice('inspection:'.length);
  return undefined;
}

/** Collapse duplicate inspection PDF rows so checklist counts match the portal API. */
export function dedupePropertyDocumentsForChecklist(
  documents: UploadedDocumentLike[],
): UploadedDocumentLike[] {
  const seenIds = new Set<string>();
  const seenInspectionUrl = new Set<string>();
  const seenInspectionHref = new Set<string>();
  const out: UploadedDocumentLike[] = [];

  for (const doc of documents) {
    if (seenIds.has(doc.id)) continue;

    const href = doc.href?.trim();
    const inspectionId = parseInspectionIdFromDocumentId(doc.id);

    if (inspectionId && href) {
      const key = `${inspectionId}:${href}`;
      if (seenInspectionUrl.has(key)) continue;
      seenInspectionUrl.add(key);
    }

    if (href && (inspectionId || doc.id.startsWith('inspection:'))) {
      if (seenInspectionHref.has(href)) continue;
      seenInspectionHref.add(href);
    }

    seenIds.add(doc.id);
    out.push(doc);
  }

  return out;
}
