'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { AGENT_UI, type AgentUiVariant } from '@/constants/agent-ui';

const AgentUiContext = createContext<AgentUiVariant>(AGENT_UI.V1);

/**
 * The variant is resolved on the server (live env, not a build-time public var)
 * and passed in so client chrome can branch without reading `document` and
 * flashing v1 on the first paint.
 */
export function AgentUiProvider({
  ui,
  children,
}: {
  ui: AgentUiVariant;
  children: ReactNode;
}) {
  return <AgentUiContext.Provider value={ui}>{children}</AgentUiContext.Provider>;
}

export function useAgentUi(): AgentUiVariant {
  return useContext(AgentUiContext);
}

export function useIsAgentUiV2(): boolean {
  return useAgentUi() === AGENT_UI.V2;
}
