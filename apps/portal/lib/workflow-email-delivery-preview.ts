const SIGNATURE_MARKER = 'data-crossub-email-signature';

export function defaultEmailLogoUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/crossub-logo.png`;
  }
  return '/crossub-logo.png';
}

export function crossubEmailSignatureHtml(logoUrl: string): string {
  return `
<div ${SIGNATURE_MARKER}="true" style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
  <img src="${logoUrl}" alt="CROSSUB" width="56" height="56" style="display:block;width:56px;height:56px;margin:0 0 10px 0;border:0;" />
  <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">CROSSUB</p>
  <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">Property Management Platform</p>
</div>`.trim();
}

export function crossubEmailSignatureText(): string {
  return '\n\n--\nCROSSUB\nProperty Management Platform';
}

export function emailBodyHasCrossubSignature(content: string): boolean {
  return (
    content.includes(SIGNATURE_MARKER) ||
    content.includes('crossub-logo.png') ||
    content.includes('data-crossub-email-signature')
  );
}

export function appendCrossubEmailSignature(
  html: string,
  text: string,
  logoUrl: string,
): { html: string; text: string } {
  if (emailBodyHasCrossubSignature(html) || emailBodyHasCrossubSignature(text)) {
    return { html, text };
  }
  return {
    html: `${html}\n${crossubEmailSignatureHtml(logoUrl)}`,
    text: `${text}${crossubEmailSignatureText()}`,
  };
}
