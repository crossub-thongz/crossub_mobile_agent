export const AGENT_PAGE_TOUR_EVENT = 'crossub:agent-page-tour';

export function startAgentPageTour(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AGENT_PAGE_TOUR_EVENT));
}

export function subscribeAgentPageTour(onStart: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => onStart();
  window.addEventListener(AGENT_PAGE_TOUR_EVENT, handler);
  return () => window.removeEventListener(AGENT_PAGE_TOUR_EVENT, handler);
}

export function findTourTarget(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (rect.width < 2 || rect.height < 2) continue;
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    return node;
  }
  return null;
}
