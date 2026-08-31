'use client';

import * as React from 'react';

import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  AGENT_INPUT_RULES,
  type AgentInputKind,
  agentInputRequirementText,
  agentInputValueLength,
} from '@/lib/agent-input-rules';
import {
  AGENT_INPUT_FEEDBACK_EVENT,
  type AgentInputFeedbackDetail,
} from '@/lib/agent-input-feedback-event';
import { cn } from '@/lib/utils';

const FEEDBACK_LOCK_MS = 400;

export function AgentInputHint({
  kind,
  notices,
  focused,
  value,
}: {
  kind: AgentInputKind;
  notices: string[];
  focused: boolean;
  value: string;
}) {
  const rule = AGENT_INPUT_RULES[kind];
  const length = agentInputValueLength(value);
  const atLimit = length >= rule.maxLength;

  return (
    <div className="space-y-0.5">
      {notices.map((notice) => (
        <p key={notice} className="text-destructive text-[11px] leading-snug">
          {notice}
        </p>
      ))}
      <p className="text-muted-foreground flex items-start justify-between gap-2 text-[11px] leading-snug">
        <span>{agentInputRequirementText(kind)}</span>
        {focused ? (
          <span
            className={cn(
              'shrink-0 tabular-nums',
              atLimit ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            {length.toLocaleString()} / {rule.maxLength.toLocaleString()}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Shows field requirements on focus, and the specific rule they missed
 * when HTML, line breaks, emoji, or length is stripped.
 */
export function AgentInputFeedbackAnchor({
  kind,
  value,
  children,
  className,
}: {
  kind?: AgentInputKind;
  value?: string;
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const isV2 = useIsAgentUiV2();
  const enabled = isV2 && !!kind;
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const lastFeedbackAt = React.useRef(0);
  const [focused, setFocused] = React.useState(false);
  const [notices, setNotices] = React.useState<string[]>([]);

  const onFeedback = React.useCallback((event: Event) => {
    const messages = (event as CustomEvent<AgentInputFeedbackDetail>).detail?.messages ?? [];
    if (!messages.length) return;
    setNotices(messages);
    lastFeedbackAt.current = Date.now();
  }, []);

  const onInput = React.useCallback(() => {
    if (Date.now() - lastFeedbackAt.current < FEEDBACK_LOCK_MS) return;
    setNotices([]);
  }, []);

  const setWrapNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      const previous = wrapRef.current;
      if (previous) {
        previous.removeEventListener(AGENT_INPUT_FEEDBACK_EVENT, onFeedback);
        previous.removeEventListener('input', onInput);
      }
      wrapRef.current = node;
      if (!node) return;
      node.addEventListener(AGENT_INPUT_FEEDBACK_EVENT, onFeedback);
      node.addEventListener('input', onInput);
    },
    [onFeedback, onInput],
  );

  if (!enabled || !kind) return children;

  const showHint = focused || notices.length > 0;

  return (
    <div
      ref={setWrapNode}
      className={cn(
        'flex min-w-0 flex-col gap-1',
        className?.includes('flex-1') ? 'flex-1' : 'w-full',
        className,
      )}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setFocused(false);
        }
      }}
    >
      {children}
      {showHint ? (
        <AgentInputHint
          kind={kind}
          notices={notices}
          focused={focused}
          value={value ?? ''}
        />
      ) : null}
    </div>
  );
}
