import type { AgentPageGuideId } from '@/constants/agent-page-guides';

type ContextualGuideListener = (guideId: AgentPageGuideId | null) => void;

let contextualGuideId: AgentPageGuideId | null = null;
const listeners = new Set<ContextualGuideListener>();

export function setContextualAgentPageGuide(guideId: AgentPageGuideId | null): void {
  contextualGuideId = guideId;
  listeners.forEach((listener) => listener(contextualGuideId));
}

export function subscribeContextualAgentPageGuide(
  listener: ContextualGuideListener,
): () => void {
  listeners.add(listener);
  listener(contextualGuideId);
  return () => {
    listeners.delete(listener);
  };
}
