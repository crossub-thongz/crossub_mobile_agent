import type { MaintenanceWorkspaceCase } from './types';

const ADVICE_VARIANTS = [
  `Based on the provided photos/videos and your description, the evidence suggests this issue is most likely tied to a specific failure point. Before final determination, compare the failure location (inside vs shared access points) and confirm whether the scope matches tenant-controlled components or broader infrastructure.\n\nRecommended checks (reasoning-only):\n- Verify the failure point location and boundary (unit-controlled vs common/shared).\n- Review uploaded evidence for clarity around source (appliance/supply/fixture).\n- If any key angle is missing, request targeted additional footage.`,
  `From the description and visible indicators in the evidence, the next best action is to validate scope and source of failure. Ensure the uploaded materials clearly show where the fault originates and whether it impacts a wider system.\n\nRecommended checks (reasoning-only):\n- Map the likely cause to the closest asset boundary.\n- Check for timestamps/sequence that explain how the fault developed.\n- If the evidence does not pinpoint the source, request specific missing angles.`,
  `The current evidence appears sufficient for a preliminary pathway selection, but responsibility still needs manual confirmation after evidence review. Use the uploaded media to confirm whether this looks like day-to-day wear within controlled areas or a broader services failure.\n\nRecommended checks (reasoning-only):\n- Confirm whether the affected component is part of tenant-accessible items.\n- Confirm whether the affected component involves shared building services.\n- If uncertain, escalate with the most relevant targeted evidence gaps.`,
] as const;

const ADVICE_FOOTER =
  'Notes: This is support reasoning only. Final responsibility remains a manual decision by staff once evidence is reviewed.';

export function generateWorkspaceAdvice(request: MaintenanceWorkspaceCase): string {
  const storageKey = `crossub-maintenance-advice:${request.id}`;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) return stored;
    } catch {
      // ignore
    }
  }

  const seed = `${request.id}:${request.description.length}:${request.issueType}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000;
  }
  const advice = `${ADVICE_VARIANTS[hash % ADVICE_VARIANTS.length]}\n\n${ADVICE_FOOTER}`;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, advice);
    } catch {
      // ignore
    }
  }

  return advice;
}
