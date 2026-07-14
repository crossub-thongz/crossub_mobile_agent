/** Read a File as base64 (no `data:` URI prefix) for base64-through-API uploads. */
export function fileToBase64(file: File): Promise<string> {
  return fileToBase64WithProgress(file);
}

export type UploadProgressCallback = (percent: number) => void;

const READ_PROGRESS_WEIGHT = 40;
const NETWORK_PROGRESS_WEIGHT = 60;

/** Read a File as base64, reporting progress from 0–40%. */
export function fileToBase64WithProgress(
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const readPct = Math.round((event.loaded / event.total) * READ_PROGRESS_WEIGHT);
        onProgress(Math.min(READ_PROGRESS_WEIGHT, readPct));
      }
    };
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      onProgress?.(READ_PROGRESS_WEIGHT);
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Map network upload progress (0–100) into the 40–100% band. */
export function mapNetworkUploadProgress(networkPercent: number): number {
  return READ_PROGRESS_WEIGHT + Math.round((networkPercent / 100) * NETWORK_PROGRESS_WEIGHT);
}

/** Raw file size cap — base64 JSON payload is ~4/3× this (API/BFF allow 150 MB). */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = '100 MB';

const BLOCKED_VIDEO_MIME = /^video\//i;
const BLOCKED_GIF_MIME = /^image\/gif$/i;
const BLOCKED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'm4v',
  'wmv',
  'flv',
  'mpeg',
  'mpg',
  '3gp',
  'ogv',
]);

export function fileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';
}

/** Videos and GIFs are not accepted as property documents. */
export function isBlockedDocumentFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (BLOCKED_VIDEO_MIME.test(mime)) return true;
  if (BLOCKED_GIF_MIME.test(mime)) return true;
  const ext = fileExtension(file);
  if (ext === 'gif') return true;
  if (BLOCKED_VIDEO_EXTENSIONS.has(ext)) return true;
  return false;
}

export type FileUploadFilterResult = {
  ok: File[];
  oversized: File[];
  blocked: File[];
};

/** Split files into uploadable, oversized, and blocked (video/GIF) buckets. */
export function filterUploadableFiles(files: File[]): FileUploadFilterResult {
  const ok: File[] = [];
  const oversized: File[] = [];
  const blocked: File[] = [];
  for (const file of files) {
    if (isBlockedDocumentFile(file)) {
      blocked.push(file);
    } else if (file.size > MAX_UPLOAD_BYTES) {
      oversized.push(file);
    } else {
      ok.push(file);
    }
  }
  return { ok, oversized, blocked };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
