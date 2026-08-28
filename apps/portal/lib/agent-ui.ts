import {
  AGENT_UI,
  AGENT_UI_V2_VALUES,
  DEFAULT_AGENT_UI,
  type AgentUiVariant,
} from '@/constants/agent-ui';

/**
 * Decide which Agent UI this deployment serves.
 *
 * Silence is v1. The redesign is an explicit opt-in so a missing variable on
 * production — the usual state — keeps the live app looking as it does today.
 */
export function resolveAgentUi(raw?: string | null): AgentUiVariant {
  const value = raw?.trim().toLowerCase() ?? '';
  if (!value) return DEFAULT_AGENT_UI;
  if (AGENT_UI_V2_VALUES.includes(value)) return AGENT_UI.V2;
  return DEFAULT_AGENT_UI;
}
