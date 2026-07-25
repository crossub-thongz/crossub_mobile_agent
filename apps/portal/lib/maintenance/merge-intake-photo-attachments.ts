import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';

function normalizeMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '') || trimmed;
  }
}

function mimeTypeFromMediaUrl(url: string): string {
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'video/mp4';
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
}

function fileNameFromMediaUrl(url: string, index: number): string {
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (segment) return decodeURIComponent(segment);
  } catch {
    // ignore malformed URLs
  }
  return `evidence-${index + 1}.jpg`;
}

/** Materialize Prisma intake photo URLs when the workflow board has not hydrated attachments yet. */
export function mergeIntakePhotoAttachments(
  requestId: string,
  intakePhotoUrls: string[] | undefined,
  attachments: ApiMaintenanceAttachment[],
  createdAt: string,
  uploadedByRole: ApiMaintenanceAttachment['uploadedByRole'] = 'admin',
): ApiMaintenanceAttachment[] {
  const urls = intakePhotoUrls ?? [];
  if (!urls.length) return attachments;

  const merged = [...attachments];
  const existingUrls = new Set(
    attachments
      .filter((a) => a.kind === 'initial_evidence' && a.previewUrl)
      .map((a) => `${a.maintenanceRequestId}:${normalizeMediaUrl(a.previewUrl!)}`),
  );
  const existingIds = new Set(attachments.map((a) => a.id));

  urls.forEach((rawUrl, index) => {
    const url = rawUrl.trim();
    if (!url) return;
    const dedupeKey = `${requestId}:${normalizeMediaUrl(url)}`;
    if (existingUrls.has(dedupeKey)) return;
    existingUrls.add(dedupeKey);

    const id = `INTAKE-${requestId}-${index}`;
    if (existingIds.has(id)) return;
    existingIds.add(id);

    merged.unshift({
      id,
      maintenanceRequestId: requestId,
      kind: 'initial_evidence',
      fileName: fileNameFromMediaUrl(url, index),
      mimeType: mimeTypeFromMediaUrl(url),
      sizeBytes: 0,
      uploadedAt: createdAt,
      uploadedByRole,
      previewUrl: url,
    });
  });

  return merged;
}

export function dedupeMaintenanceAttachmentsByMediaUrl(
  attachments: ApiMaintenanceAttachment[],
): ApiMaintenanceAttachment[] {
  const seen = new Set<string>();
  const result: ApiMaintenanceAttachment[] = [];

  for (const att of attachments) {
    const preview = att.previewUrl?.trim();
    const key = preview
      ? `${att.maintenanceRequestId}:${att.kind}:${normalizeMediaUrl(preview)}`
      : `${att.maintenanceRequestId}:${att.kind}:id:${att.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(att);
  }

  return result;
}

/** One row per media URL — prefer the first kind in the list (evidence before intake). */
export function dedupeMaintenanceAttachmentsAcrossKinds(
  attachments: ApiMaintenanceAttachment[],
): ApiMaintenanceAttachment[] {
  const seen = new Set<string>();
  const result: ApiMaintenanceAttachment[] = [];

  for (const att of attachments) {
    const preview = att.previewUrl?.trim();
    const key = preview
      ? `${att.maintenanceRequestId}:${normalizeMediaUrl(preview)}`
      : `${att.maintenanceRequestId}:id:${att.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(att);
  }

  return result;
}

/** Strata / direct-resolution jobs: intake photos and completion evidence share the same review gallery. */
export function completionReviewAttachments(
  requestId: string,
  attachments: ApiMaintenanceAttachment[],
  responsibility: 'tenant' | 'landlord' | 'strata' | undefined,
): ApiMaintenanceAttachment[] {
  const forRequest = attachments.filter((a) => a.maintenanceRequestId === requestId);
  const evidence = forRequest.filter((a) => a.kind === 'evidence');
  const intake = forRequest.filter((a) => a.kind === 'initial_evidence');

  const pool =
    responsibility === 'strata' || (responsibility === 'tenant' && evidence.length === 0)
      ? [...evidence, ...intake]
      : evidence;

  return dedupeMaintenanceAttachmentsAcrossKinds(pool);
}
