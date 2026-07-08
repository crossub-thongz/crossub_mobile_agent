/** Parse typed or pasted invite contacts (comma / newline / semicolon separated). */
export function parseViewerInviteInput(
  raw: string,
): { email?: string; phone?: string }[] {
  const tokens = raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const out: { email?: string; phone?: string }[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const parsed = parseViewerInviteToken(token);
    if (!parsed) continue;
    const key = parsed.email ?? parsed.phone ?? '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

export function parseViewerInviteToken(
  token: string,
): { email?: string; phone?: string } | null {
  const value = token.trim();
  if (!value) return null;

  if (value.includes('@')) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { email };
  }

  const digits = value.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 8) return null;
  return { phone: digits };
}

export function formatViewerInviteRecipient(r: {
  email?: string | null;
  phone?: string | null;
}): string {
  return r.email ?? r.phone ?? '—';
}

export function viewerInviteChannelLabel(channel: 'email' | 'sms'): string {
  return channel === 'email' ? 'Email' : 'SMS';
}
