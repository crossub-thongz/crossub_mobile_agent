export type ReferenceCheckRecommendation = 'recommend' | 'reject';

export type ReferenceCheckDraft = {
  notes: string;
  recommendation?: ReferenceCheckRecommendation;
};

const JSON_PREFIX = '{"referenceCheck":';

export function parseReferenceCheckDraft(raw: string | null | undefined): ReferenceCheckDraft {
  const value = raw?.trim() ?? '';
  if (!value) return { notes: '' };
  if (value.startsWith(JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(value) as {
        referenceCheck?: { notes?: string; recommendation?: ReferenceCheckRecommendation };
      };
      const draft = parsed.referenceCheck;
      return {
        notes: draft?.notes?.trim() ?? '',
        recommendation:
          draft?.recommendation === 'recommend' || draft?.recommendation === 'reject'
            ? draft.recommendation
            : undefined,
      };
    } catch {
      return { notes: value };
    }
  }
  return { notes: value };
}

export function serializeReferenceCheckDraft(draft: ReferenceCheckDraft): string {
  const notes = draft.notes.trim();
  if (!draft.recommendation) return notes;
  return JSON.stringify({
    referenceCheck: {
      notes,
      recommendation: draft.recommendation,
    },
  });
}
