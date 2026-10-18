'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Link2, Loader2, MessagesSquare, Unlink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ConversationPropertyOption } from '@/components/agent/conversations/conversation-list';
import { OwnerDecisionTimeline } from '@/components/agent/decision-with-owner-email';
import { EmptyState } from '@/components/agent/empty-state';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { ModuleLanePill } from '@/components/agent/module-workspace/module-workspace';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Button } from '@/components/ui/button';
import {
  CONVERSATION_ACTION,
  CONVERSATION_SELECT_PROMPT_VALUE,
  CONVERSATION_WORKFLOW_TYPE_LABEL,
  CONVERSATIONS_COPY,
  type ConversationAction,
} from '@/constants/conversations';
import { MODULE_WORKSPACE_LABELS } from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE_CASE_TYPE } from '@/constants/owner-decision';
import { propertyDetail } from '@/constants/routes';
import { useConversationAction } from '@/hooks/use-agent-conversations';
import {
  conversationJobKey,
  linkableConversationJobs,
  type LinkableConversationJob,
} from '@/lib/agent-conversations';
import { resolveConversationJob, type ConversationJobContext } from '@/lib/conversation-job-context';
import {
  fetchAgentConversation,
  fetchAgentConversationJobs,
  linkAgentConversationJob,
  setAgentConversationProperty,
  unlinkAgentConversationJob,
  type AgentConversationDetail,
} from '@/lib/crossub-api/agent-conversation-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border/60 border-t px-4 py-4 first:border-t-0">
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** "File under property" for a thread with none: the agent's Self-Manage properties of its agency. */
function FileUnderProperty({
  detail,
  propertyOptions,
  onChange,
}: {
  detail: AgentConversationDetail;
  propertyOptions: readonly ConversationPropertyOption[];
  onChange: (detail: AgentConversationDetail) => void;
}) {
  const { pending, run } = useConversationAction();
  const [propertyId, setPropertyId] = useState<string>(CONVERSATION_SELECT_PROMPT_VALUE);

  const save = async () => {
    if (propertyId === CONVERSATION_SELECT_PROMPT_VALUE) return;
    const next = await run(CONVERSATION_ACTION.PROPERTY, () =>
      setAgentConversationProperty(detail.id, propertyId),
    );
    if (!next) return;
    onChange(next);
    toast.success(CONVERSATIONS_COPY.propertyFiled);
  };

  return (
    <div className="space-y-3 p-4">
      <EmptyState
        icon={MessagesSquare}
        title={CONVERSATIONS_COPY.noPropertyTitle}
        description={CONVERSATIONS_COPY.noPropertyDescription}
      />
      <select
        aria-label={CONVERSATIONS_COPY.fileUnderProperty}
        className={SELECT_CLASS}
        value={propertyId}
        disabled={pending !== null}
        onChange={(e) => setPropertyId(e.target.value)}
      >
        <option value={CONVERSATION_SELECT_PROMPT_VALUE}>{CONVERSATIONS_COPY.fileUnderPropertyPlaceholder}</option>
        {propertyOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        className="h-8 w-full gap-1.5"
        disabled={pending !== null || propertyId === CONVERSATION_SELECT_PROMPT_VALUE}
        onClick={() => void save()}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {CONVERSATIONS_COPY.fileUnderProperty}
      </Button>
    </div>
  );
}

/** Linked job: the portfolio's view of it when loaded, else the server's reference; link and unlink. */
function LinkedJobSection({
  detail,
  job,
  onChange,
}: {
  detail: AgentConversationDetail;
  job: ConversationJobContext | null;
  onChange: (detail: AgentConversationDetail) => void;
}) {
  const { pending, run } = useConversationAction();
  const [jobs, setJobs] = useState<LinkableConversationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobKey, setJobKey] = useState<string>(CONVERSATION_SELECT_PROMPT_VALUE);
  const busy = pending !== null;

  useEffect(() => {
    if (detail.caseId) return;
    let cancelled = false;
    setJobsLoading(true);
    void fetchAgentConversationJobs(detail.id)
      .then((options) => {
        if (!cancelled) setJobs(linkableConversationJobs(options));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setJobs([]);
          toast.error(apiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail.caseId, detail.id, detail.propertyId]);

  /** The link routes return the link, not the thread; re-read it so every pane agrees. */
  const linkThenReload = async (
    key: ConversationAction,
    write: () => Promise<unknown>,
    success: string,
  ) => {
    const next = await run(key, async () => {
      await write();
      return fetchAgentConversation(detail.id);
    });
    if (!next) return;
    setJobKey(CONVERSATION_SELECT_PROMPT_VALUE);
    onChange(next);
    toast.success(success);
  };

  const link = () => {
    const chosen = jobs.find((j) => conversationJobKey(j) === jobKey);
    if (!chosen) return;
    void linkThenReload(
      CONVERSATION_ACTION.LINK_JOB,
      () => linkAgentConversationJob(detail.id, { workflowType: chosen.workflowType, workflowId: chosen.workflowId }),
      CONVERSATIONS_COPY.jobLinked,
    );
  };

  const unlink = () =>
    void linkThenReload(
      CONVERSATION_ACTION.UNLINK_JOB,
      () => unlinkAgentConversationJob(detail.id),
      CONVERSATIONS_COPY.jobUnlinked,
    );

  if (detail.caseId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-[11px]">
            {job?.reference ?? detail.caseLabel ?? MODULE_WORKSPACE_LABELS.noValue}
          </span>
          {job ? <ModuleLanePill lane={job.lane} /> : null}
        </div>
        {job ? <p className="text-sm font-medium">{job.title}</p> : null}
        <div className="flex flex-wrap gap-2">
          {job ? (
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <Link href={job.href}>
                <ExternalLink className="size-3.5" />
                {CONVERSATIONS_COPY.openJob}
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5"
            disabled={busy}
            onClick={unlink}
          >
            {pending === CONVERSATION_ACTION.UNLINK_JOB ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Unlink className="size-3.5" />
            )}
            {CONVERSATIONS_COPY.unlinkJob}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{CONVERSATIONS_COPY.noLinkedJob}</p>
      {jobsLoading ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          {CONVERSATIONS_COPY.loading}
        </p>
      ) : jobs.length === 0 ? (
        <p className="text-muted-foreground text-xs">{CONVERSATIONS_COPY.noJobs}</p>
      ) : (
        <>
          <select
            aria-label={CONVERSATIONS_COPY.linkJob}
            className={cn(SELECT_CLASS, 'text-xs')}
            value={jobKey}
            disabled={busy}
            onChange={(e) => setJobKey(e.target.value)}
          >
            <option value={CONVERSATION_SELECT_PROMPT_VALUE}>{CONVERSATIONS_COPY.linkJobPlaceholder}</option>
            {jobs.map((j) => (
              <option key={conversationJobKey(j)} value={conversationJobKey(j)}>
                {[CONVERSATION_WORKFLOW_TYPE_LABEL[j.workflowType], j.reference, j.statusLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={busy || jobKey === CONVERSATION_SELECT_PROMPT_VALUE}
            onClick={link}
          >
            {pending === CONVERSATION_ACTION.LINK_JOB ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Link2 className="size-3.5" />
            )}
            {CONVERSATIONS_COPY.linkJob}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Right pane: the thread's property (or "File under property" when it has none), the linked job
 * with link / unlink, and the property's owner decisions.
 */
export function ConversationContextPane({
  detail,
  propertyOptions,
  onChange,
  onBack,
}: {
  detail: AgentConversationDetail;
  propertyOptions: readonly ConversationPropertyOption[];
  onChange: (detail: AgentConversationDetail) => void;
  /** Mobile only: back to the conversation. */
  onBack?: () => void;
}) {
  const isV2 = useIsAgentUiV2();
  const { properties, archivedProperties, maintenanceAll, inspections, leasingCycles } = useAgentData();

  const property = useMemo(() => {
    if (!detail.propertyId) return null;
    return (
      properties.find((p) => p.id === detail.propertyId) ??
      archivedProperties.find((p) => p.id === detail.propertyId) ??
      null
    );
  }, [archivedProperties, detail.propertyId, properties]);

  const job = useMemo(
    () => resolveConversationJob(detail.caseId, { maintenance: maintenanceAll, inspections, leasingCycles }, isV2),
    [detail.caseId, inspections, isV2, leasingCycles, maintenanceAll],
  );

  const backBar = onBack ? (
    <div className="border-b px-2 py-2">
      <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {CONVERSATIONS_COPY.showThread}
      </Button>
    </div>
  ) : null;

  if (!detail.propertyId) {
    return (
      <div>
        {backBar}
        <FileUnderProperty detail={detail} propertyOptions={propertyOptions} onChange={onChange} />
      </div>
    );
  }

  return (
    <div>
      {backBar}
      <ContextSection title={CONVERSATIONS_COPY.propertyHeading}>
        <p className="text-sm font-medium leading-snug">
          {property ? formatPropertyFullAddress(property) : (detail.propertyAddress ?? MODULE_WORKSPACE_LABELS.noValue)}
        </p>
        {property ? (
          <dl className="mt-2 grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{CONVERSATIONS_COPY.ownerLabel}</dt>
            <dd className="min-w-0 truncate">
              {property.homeOwnerName || MODULE_WORKSPACE_LABELS.noValue}
              {property.homeOwnerContact.email ? (
                <span className="text-muted-foreground"> · {property.homeOwnerContact.email}</span>
              ) : null}
            </dd>
            <dt className="text-muted-foreground">{CONVERSATIONS_COPY.tenantLabel}</dt>
            <dd className="min-w-0 truncate">{property.tenantName || MODULE_WORKSPACE_LABELS.noValue}</dd>
          </dl>
        ) : null}
        <Button asChild size="sm" variant="outline" className="mt-3 h-8 gap-1.5">
          <Link href={propertyDetail(detail.propertyId)}>
            <ExternalLink className="size-3.5" />
            {CONVERSATIONS_COPY.openProperty}
          </Link>
        </Button>
      </ContextSection>

      <ContextSection title={CONVERSATIONS_COPY.linkedJobHeading}>
        <LinkedJobSection key={detail.id} detail={detail} job={job} onChange={onChange} />
      </ContextSection>

      <ContextSection title={CONVERSATIONS_COPY.decisionsHeading}>
        <OwnerDecisionTimeline
          propertyId={detail.propertyId}
          caseType={job ? OWNER_DECISION_MODULE_CASE_TYPE[job.module] : undefined}
          caseId={job?.caseId}
        />
      </ContextSection>
    </div>
  );
}
