/** QR image for an apply URL (external generator — no API key required). */
export function openInspectionQrImageUrl(applyUrl: string, size = 320): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(applyUrl)}`;
}

/** Download the QR code PNG for sharing offline. */
export async function downloadOpenInspectionQr(
  applyUrl: string,
  filename = 'rental-application-qr.png',
): Promise<void> {
  const imageUrl = openInspectionQrImageUrl(applyUrl, 512);
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error('Could not load QR image');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
