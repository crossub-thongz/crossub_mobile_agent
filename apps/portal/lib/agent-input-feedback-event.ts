export const AGENT_INPUT_FEEDBACK_EVENT = 'agentinputfeedback';

export type AgentInputFeedbackDetail = {
  messages: string[];
};

export function dispatchAgentInputFeedback(el: EventTarget, messages: string[]) {
  if (!messages.length) return;
  queueMicrotask(() => {
    el.dispatchEvent(
      new CustomEvent<AgentInputFeedbackDetail>(AGENT_INPUT_FEEDBACK_EVENT, {
        bubbles: true,
        detail: { messages },
      }),
    );
  });
}
