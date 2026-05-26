import type { AuthUser } from '@/lib/auth-types';

/** Portfolio id — later replaced by API field on the agent profile. */
export type AgentPortfolioId = 'agent-1' | 'agent-2';

export function resolveAgentPortfolioId(user: AuthUser | null): AgentPortfolioId {
  if (!user) return 'agent-1';
  const email = user.email.toLowerCase();
  if (email.includes('agent2') || email.includes('agent-2')) return 'agent-2';
  return 'agent-1';
}

export function filterByPropertyIds<T extends { propertyId: string }>(
  items: T[],
  propertyIds: Set<string>,
): T[] {
  return items.filter((i) => propertyIds.has(i.propertyId));
}
