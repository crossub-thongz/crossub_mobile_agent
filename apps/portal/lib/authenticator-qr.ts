import { qrcodegen } from '@/lib/qrcodegen';

const QUIET_ZONE = 4;

/** SVG path for an authenticator otpauth URL. The quiet zone is included. */
export function authenticatorQr(value: string): { size: number; path: string } {
  const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM);
  const size = qr.size + QUIET_ZONE * 2;
  let path = '';
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { size, path };
}
