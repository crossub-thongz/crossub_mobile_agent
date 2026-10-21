'use client';

import { ArrowLeft, CheckCircle2, Loader2, Paperclip, PanelRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { ReplyComposer } from '@/components/agent/conversations/reply-composer';
import { MessageBody } from '@/components/agent/message-body';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import {
  CONVERSATION_ACTION,
  CONVERSATION_MESSAGE_DIRECTION,
  CONVERSATION_STATE_ACTION,
  CONVERSATION_UNASSIGNED_VALUE,
  CONVERSATIONS_COPY,
} from '@/constants/conversations';
import { useConversationAction } from '@/hooks/use-agent-conversations';
import { conversationHeadline, teamMemberName } from '@/lib/agent-conversations';
import type { AgencyTeamMember } from '@/lib/crossub-api/agent-client';
import {
  setAgentConversationAssignee,
  setAgentConversationState,
  type AgentConversationDetail,
  type AgentConversationMessage,
  type AgentConversationTemplate,
} from '@/lib/crossub-api/agent-conversation-client';
import { toPlainTextBody } from '@/lib/message-body';
import { cn, formatDateTime } from '@/lib/utils';

function ConversationMessageBubble({ message }: { message: AgentConversationMessage }) {
  const outbound = message.direction === CONVERSATION_MESSAGE_DIRECTION.OUTBOUND;
  const attachments = message.attachments.filter((a) => !a.inline);
  return (
    <div className={cn('flex w-full', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
          outbound
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground border border-sky-500/35 bg-sky-500/12 dark:border-sky-400/25 dark:bg-sky-950/40',
        )}
      >
        <div
          className={cn(
            'mb-1 flex flex-wrap items-center gap-1.5 text-[11px]',
            outbound ? 'text-primary-foreground/75' : 'text-sky-800/90 dark:text-sky-200/80',
          )}
        >
          <span className="font-semibold tracking-wide uppercase">
            {outbound ? CONVERSATIONS_COPY.outbound : CONVERSATIONS_COPY.inbound}
          </span>
          <span className="font-medium">{message.from}</span>
          {message.fromEmail && message.fromEmail !== message.from ? <span>{message.fromEmail}</span> : null}
          <span className="tabular-nums">{formatDateTime(message.sentAt)}</span>
        </div>
        {outbound && message.toEmail ? (
          <p className="text-primary-foreground/75 mb-1 text-[11px]">
            {CONVERSATIONS_COPY.toLabel}: {message.toEmail}
          </p>
        ) : null}
        <MessageBody body={toPlainTextBody(message.body)} />
        {attachments.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {attachments.map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                >
                  <Paperclip className="size-3" />
                  {a.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function AssigneeSelect({
  detail,
  team,
  disabled,
  onChange,
}: {
  detail: AgentConversationDetail;
  team: readonly AgencyTeamMember[];
  disabled: boolean;
  onChange: (assignedToId: string | null) => void;
}) {
  const assigneeMissing = Boolean(
    detail.assignedToId && !team.some((m) => m.userId === detail.assignedToId),
  );
  return (
    <select
      aria-label={CONVERSATIONS_COPY.assigneeLabel}
      className={cn(SELECT_CLASS, 'h-8 w-44 text-xs')}
      value={detail.assignedToId ?? CONVERSATION_UNASSIGNED_VALUE}
      disabled={disabled}
      onChange={(e) =>
        onChange(e.target.value === CONVERSATION_UNASSIGNED_VALUE ? null : e.target.value)
      }
    >
      <option value={CONVERSATION_UNASSIGNED_VALUE}>{CONVERSATIONS_COPY.unassigned}</option>
      {assigneeMissing && detail.assignedToId ? (
        <option value={detail.assignedToId}>
          {detail.assignedToName?.trim() || CONVERSATIONS_COPY.assigneeOutsideTeam}
        </option>
      ) : null}
      {team.map((m) => (
        <option key={m.userId} value={m.userId}>
          {teamMemberName(m)}
        </option>
      ))}
    </select>
  );
}

/**
 * Middle pane: the thread's messages, Resolve / Reopen, the assignee, and the email reply
 * composer. Every write hands the returned thread back up.
 */
export function ConversationThread({
  detail,
  team,
  templates,
  onChange,
  onBack,
  onShowContext,
}: {
  detail: AgentConversationDetail;
  team: readonly AgencyTeamMember[];
  templates: readonly AgentConversationTemplate[];
  onChange: (detail: AgentConversationDetail) => void;
  /** Mobile only: back to the list. */
  onBack?: () => void;
  /** Mobile only: switch to the job context. */
  onShowContext?: () => void;
}) {
  const { pending, run } = useConversationAction();
  const busy = pending !== null;

  const toggleState = async () => {
    const action = detail.resolved ? CONVERSATION_STATE_ACTION.REOPEN : CONVERSATION_STATE_ACTION.RESOLVE;
    const next = await run(CONVERSATION_ACTION.STATE, () => setAgentConversationState(detail.id, action));
    if (!next) return;
    onChange(next);
    toast.success(next.resolved ? CONVERSATIONS_COPY.resolvedToast : CONVERSATIONS_COPY.reopenedToast);
  };

  const assign = async (assignedToId: string | null) => {
    const next = await run(CONVERSATION_ACTION.ASSIGN, () =>
      setAgentConversationAssignee(detail.id, assignedToId),
    );
    if (!next) return;
    onChange(next);
    toast.success(CONVERSATIONS_COPY.assigneeSaved);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b px-4 py-3">
        <div className="flex items-start gap-2">
          {onBack ? (
            <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" onClick={onBack}>
              <ArrowLeft className="size-4" />
              <span className="sr-only">{CONVERSATIONS_COPY.back}</span>
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{conversationHeadline(detail)}</h2>
            <p className="text-muted-foreground truncate text-xs">
              {detail.propertyAddress ?? CONVERSATIONS_COPY.noProperty}
              {detail.caseLabel ? <span className="font-mono"> · {detail.caseLabel}</span> : null}
            </p>
          </div>
          {onShowContext ? (
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1" onClick={onShowContext}>
              <PanelRight className="size-3.5" />
              {CONVERSATIONS_COPY.showContext}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AssigneeSelect detail={detail} team={team} disabled={busy} onChange={(id) => void assign(id)} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={busy}
            onClick={() => void toggleState()}
          >
            {pending === CONVERSATION_ACTION.STATE ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : detail.resolved ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {detail.resolved ? CONVERSATIONS_COPY.reopen : CONVERSATIONS_COPY.resolve}
          </Button>
        </div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {detail.messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">{CONVERSATIONS_COPY.noMessages}</p>
        ) : (
          detail.messages.map((message) => <ConversationMessageBubble key={message.id} message={message} />)
        )}
      </div>

      <ReplyComposer detail={detail} templates={templates} pending={pending} run={run} onChange={onChange} />
    </div>
  );
}
