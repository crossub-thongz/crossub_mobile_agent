/**
 * Agent UI variant — the env-gated redesign.
 *
 * Production stays on v1 until someone sets `CROSSUB_AGENT_UI=v2` on that
 * service. Staging is meant to take v2 first: the flag is read per request
 * from the live process environment (same pattern as the staging banner),
 * never from `NEXT_PUBLIC_*`, so a dashboard change does not wait on a rebuild.
 */

export const AGENT_UI_ENV_KEY = 'CROSSUB_AGENT_UI';

export const AGENT_UI = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type AgentUiVariant = (typeof AGENT_UI)[keyof typeof AGENT_UI];

/** Anything unknown — including unset — is v1, so production cannot drift onto v2 by accident. */
export const DEFAULT_AGENT_UI: AgentUiVariant = AGENT_UI.V1;

/**
 * Values that turn the redesign on.
 *
 * Compared lowercased so `V2`, `v2`, and `new` all work. `1` / `v1` / `production`
 * are not listed: they fall through to the default.
 */
export const AGENT_UI_V2_VALUES: readonly string[] = [
  'v2',
  '2',
  'new',
  'redesign',
];
