import type { MessageMention } from '@/lib/types';

export interface MentionCandidate {
  id: string;
  name: string;
  role: MessageMention['role'];
  subtitle?: string;
}

export function buildThreadMentionCandidates(input: {
  tenantName: string;
}): MentionCandidate[] {
  const candidates: MentionCandidate[] = [
    {
      id: 'crossub',
      name: 'CROSSUB Team',
      role: 'crossub',
      subtitle: 'Operations & support',
    },
  ];

  if (input.tenantName.toLowerCase() !== 'vacant') {
    candidates.push({
      id: 'tenant',
      name: input.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      role: 'tenant',
      subtitle: 'Tenant',
    });
  }

  return candidates;
}

export function insertMention(
  text: string,
  cursor: number,
  mention: MentionCandidate,
): { text: string; cursor: number } {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const atIndex = before.lastIndexOf('@');
  const prefix = atIndex >= 0 ? before.slice(0, atIndex) : before;
  const token = `@${mention.name} `;
  const next = `${prefix}${token}${after.replace(/^\S*/, '')}`;
  return { text: next, cursor: prefix.length + token.length };
}

export function detectMentionQuery(
  text: string,
  cursor: number,
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([\w\s&.'-]*)$/);
  if (!match) return null;
  return { query: match[1] ?? '', start: before.length - match[0].length };
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates;
  return candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.subtitle?.toLowerCase().includes(q),
  );
}

export function extractMentions(
  body: string,
  candidates: MentionCandidate[],
): MessageMention[] {
  const found: MessageMention[] = [];
  const pattern = /@([\w\s&.'-]+?)(?=\s|$|[.,!?])/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const name = match[1].trim();
    const candidate = candidates.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (candidate && !found.some((m) => m.name === candidate.name)) {
      found.push({ name: candidate.name, role: candidate.role });
    }
  }
  return found;
}

export function renderMentionSegments(body: string): Array<{ text: string; mention: boolean }> {
  const parts: Array<{ text: string; mention: boolean }> = [];
  const pattern = /(@[\w\s&.'-]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: body.slice(lastIndex, match.index), mention: false });
    }
    parts.push({ text: match[1], mention: true });
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < body.length) {
    parts.push({ text: body.slice(lastIndex), mention: false });
  }
  return parts.length > 0 ? parts : [{ text: body, mention: false }];
}
