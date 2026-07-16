export {
  MAX_UPLOAD_BYTES as MAX_MAINTENANCE_ATTACHMENT_BYTES,
  MAX_UPLOAD_LABEL as MAX_MAINTENANCE_ATTACHMENT_LABEL,
} from '@/lib/file-upload';

export const MAINTENANCE_INVOICE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export function isAllowedMaintenanceInvoiceMime(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return (MAINTENANCE_INVOICE_MIME_TYPES as readonly string[]).includes(normalized);
}
