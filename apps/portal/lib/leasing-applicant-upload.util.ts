import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';

export type ApplicantUploadPayload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
};

export function fileNameFromDocumentUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split('/').pop();
    if (base) return decodeURIComponent(base);
  } catch {
    // fall through
  }
  const tail = url.split('/').pop();
  return tail ? decodeURIComponent(tail) : 'document';
}

export function readFileUploadPayload(file: File): Promise<ApplicantUploadPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const contentBase64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        contentBase64,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function resolveCreatedApplicationId(
  view: ServerLeasingCycleView,
  name: string,
): string | null {
  const needle = name.trim().toLowerCase();
  const matches = view.applications.filter(
    (row) => row.applicantName?.trim().toLowerCase() === needle,
  );
  if (matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => {
    const aMs = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bMs = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bMs - aMs;
  });
  return sorted[0]?.applicationId ?? null;
}
