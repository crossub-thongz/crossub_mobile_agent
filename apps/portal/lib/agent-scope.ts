import type { AuthUser } from '@/lib/auth-types';
import {
  LEGACY_AGENT_PORTFOLIO_IDS,
  UNKNOWN_AGENT_PORTFOLIO_ID,
} from '@/constants/agent-scope';

/**
 * Which agent's book a row belongs to — the signed-in user's id.
 *
 * ⭐ This used to be the union `'agent-1' | 'agent-2'`, resolved by testing whether the login
 * email contained "agent2". That was demo scaffolding left in a live type: every real agent
 * resolved to `'agent-1'`, so two real logins on one device saw each other's offline-queued
 * rows, and on the API path the mapper stamped the constant that the provider then filtered
 * by — a tautology that scoped nothing. Real scoping on the API path is the server's
 * (`AccountManagerAssignment`); this key is what separates *device-local* rows.
 */
export type AgentPortfolioId = string;

export function resolveAgentPortfolioId(user: AuthUser | null): AgentPortfolioId {
  return user?.id || UNKNOWN_AGENT_PORTFOLIO_ID;
}

/**
 * Does `assignedAgentId` belong to the agent identified by `portfolioId`?
 *
 * Prefer this over `===` — it keeps two classes of row visible that a bare comparison would
 * silently hide: rows stamped with a legacy portfolio id, and every row when no user is
 * resolved yet. See the notes on those constants.
 */
export function isOwnedByAgent(
  assignedAgentId: string | undefined | null,
  portfolioId: AgentPortfolioId,
): boolean {
  if (portfolioId === UNKNOWN_AGENT_PORTFOLIO_ID) return true;
  if (!assignedAgentId) return true;
  if (LEGACY_AGENT_PORTFOLIO_IDS.includes(assignedAgentId)) return true;
  return assignedAgentId === portfolioId;
}

/**
 * Field-agent book: properties they registered, or that are assigned to them.
 * Principals see the full agency book from the API and should not use this.
 */
export function isFieldAgentOwnProperty(
  property: {
    assignedPortalAgentUserId?: string | null;
    createdById?: string | null;
  },
  userId: string,
): boolean {
  return (
    property.assignedPortalAgentUserId === userId ||
    property.createdById === userId
  );
}

export function filterByPropertyIds<T extends { propertyId: string }>(
  items: T[] | undefined | null,
  propertyIds: Set<string>,
): T[] {
  return (items ?? []).filter((i) => propertyIds.has(i.propertyId));
}
