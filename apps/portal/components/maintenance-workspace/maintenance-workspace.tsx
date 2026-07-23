'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { Button } from '@/components/ui/button';
import { generateWorkspaceAdvice } from '@/lib/maintenance-workspace/advice';
import {
  getQuickJumpCurrentRank,
  isStageEnabled,
  previewTitleForTarget,
  stepIdToTargetKey,
  targetKeyToStatus,
  type QuickJumpTarget,
} from '@/lib/maintenance-workspace/quick-jump';
import { SOURCE_LABELS, STATUS_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceWorkspaceCase, MaintenanceWorkspaceStatus, WorkspaceResponsibility } from '@/lib/maintenance-workspace/types';
import { getWorkflowSteps } from '@/lib/maintenance-workspace/workflow-model';
import { cn, formatCurrency } from '@/lib/utils';

import { WorkspaceBottomNav } from './bottom-nav';
import { WorkspaceTimelinePanel } from './audit-timeline';
import { WorkspaceSideInformationPanel } from './side-information-panel';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceChatPanel } from './workspace-chat-panel';
import { WorkflowStepPreview } from './workflow-step-preview';

export function MaintenanceWorkspace({
  workspaceCase,
  backHref,
  backLabel,
  onApproveQuote,
  onDeclineQuote,
  quoteAmount,
  contractorName,
  quoteExpiry,
  recommendation,
  quoteDocumentUrl,
  requiresApproval,
  liveSyncing,
  syncing,
  remindersSent = 0,
  reminderEta,
}: {
  workspaceCase: MaintenanceWorkspaceCase;
  backHref: string;
  backLabel: string;
  onApproveQuote?: () => void | Promise<void>;
  onDeclineQuote?: (reason: string) => void | Promise<void>;
  quoteAmount?: number;
  contractorName?: string;
  quoteExpiry?: string;
  recommendation?: string;
  quoteDocumentUrl?: string;
  requiresApproval?: boolean;
  liveSyncing?: boolean;
  syncing?: boolean;
  remindersSent?: number;
  reminderEta?: string | null;
}) {
  const [bottomNavTab, setBottomNavTab] = useState<'details' | 'chat'>('details');
  const [caseFlagged, setCaseFlagged] = useState(false);
  const [notifications, setNotifications] = useState(workspaceCase.notifications);
  const [pendingResponsibility, setPendingResponsibility] = useState<WorkspaceResponsibility | null>(
    workspaceCase.responsibility ?? null,
  );
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [moreEvidenceOpen, setMoreEvidenceOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [quickJumpReadOnlyMode, setQuickJumpReadOnlyMode] = useState(false);
  const [quickJumpTargetKey, setQuickJumpTargetKey] = useState<QuickJumpTarget | null>(null);

  useEffect(() => {
    setQuickJumpReadOnlyMode(false);
    setQuickJumpTargetKey(null);
  }, [workspaceCase.id]);

  useEffect(() => {
    setNotifications(workspaceCase.notifications);
  }, [workspaceCase.notifications]);

  useEffect(() => {
    if (bottomNavTab !== 'chat') return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [bottomNavTab]);

  const workspaceWithNotifications = useMemo(
    () => ({ ...workspaceCase, notifications }),
    [workspaceCase, notifications],
  );

  const steps = useMemo(
    () => getWorkflowSteps(workspaceCase, workspaceCase.quotations),
    [workspaceCase],
  );
  const activeStep = steps.find((s) => s.status === 'active') ?? steps[steps.length - 1];
  const quickJumpCurrentRank = getQuickJumpCurrentRank(workspaceCase.status);

  const uiStatusForUI = useMemo((): MaintenanceWorkspaceStatus => {
    if (quickJumpReadOnlyMode && quickJumpTargetKey) {
      return targetKeyToStatus(quickJumpTargetKey);
    }
    return workspaceCase.status;
  }, [quickJumpReadOnlyMode, quickJumpTargetKey, workspaceCase.status]);

  const statusLabel = STATUS_LABELS[workspaceCase.status] ?? workspaceCase.status;
  const isReviewStep =
    uiStatusForUI === 'under_review' || uiStatusForUI === 'pending_evidence';

  const displayActionLabel =
    quickJumpReadOnlyMode && quickJumpTargetKey
      ? previewTitleForTarget(quickJumpTargetKey, workspaceCase)
      : (activeStep?.label ?? '—');

  const displayActionSublabel =
    quickJumpReadOnlyMode && quickJumpTargetKey
      ? 'Historical view — read only'
      : activeStep?.sublabel;

  const goToStage = (target: QuickJumpTarget | null) => {
    if (!target) {
      setQuickJumpReadOnlyMode(false);
      setQuickJumpTargetKey(null);
      return;
    }
    const isLiveStage =
      (target === 'review' &&
        (workspaceCase.status === 'under_review' || workspaceCase.status === 'pending_evidence')) ||
      (target === 'quotation' && workspaceCase.status === 'pending_quotation') ||
      (target === 'approval' && workspaceCase.status === 'pending_approval') ||
      (target === 'in_progress' && workspaceCase.status === 'in_progress') ||
      (target === 'completion' && workspaceCase.status === 'completed') ||
      (target === 'closed' && workspaceCase.status === 'closed');

    if (isLiveStage) {
      setQuickJumpReadOnlyMode(false);
      setQuickJumpTargetKey(null);
      return;
    }

    if (!isStageEnabled(target, quickJumpCurrentRank)) return;
    setQuickJumpReadOnlyMode(true);
    setQuickJumpTargetKey(target);
  };

  const handleWorkflowStepClick = (stepId: string, stepStatus: 'done' | 'active' | 'upcoming') => {
    const target = stepIdToTargetKey(stepId);
    if (!target || stepStatus === 'upcoming') return;
    if (stepStatus === 'active') {
      goToStage(null);
      return;
    }
    goToStage(target);
  };

  useEffect(() => {
    const flagKey = `crossub-maintenance-flagged:${workspaceCase.id}`;
    try {
      setCaseFlagged(window.localStorage.getItem(flagKey) === 'true');
    } catch {
      // ignore
    }
    setAiAdvice(generateWorkspaceAdvice(workspaceCase));
  }, [workspaceCase]);

  const toggleFlag = () => {
    const next = !caseFlagged;
    setCaseFlagged(next);
    try {
      window.localStorage.setItem(`crossub-maintenance-flagged:${workspaceCase.id}`, next ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  const renderStageTags = () => {
    if (!workspaceCase.responsibility) return null;

    const tagConfig: { label: string; target: QuickJumpTarget }[] =
      workspaceCase.responsibility === 'tenant' || workspaceCase.responsibility === 'strata'
        ? [
            { label: 'REVIEW', target: 'review' },
            { label: 'IN PROGRESS', target: 'in_progress' },
            { label: 'COMPLETE', target: 'closed' },
          ]
        : [
            { label: 'REVIEW', target: 'review' },
            { label: 'PENDING QUOTATION', target: 'quotation' },
            { label: 'PENDING APPROVAL', target: 'approval' },
            { label: 'IN PROGRESS', target: 'in_progress' },
            { label: 'COMPLETE', target: 'closed' },
          ];

    const liveTarget = ((): QuickJumpTarget | null => {
      switch (workspaceCase.status) {
        case 'under_review':
        case 'pending_evidence':
          return 'review';
        case 'pending_quotation':
          return 'quotation';
        case 'pending_approval':
          return 'approval';
        case 'in_progress':
          return 'in_progress';
        case 'completed':
          return 'completion';
        case 'closed':
          return 'closed';
        default:
          return 'review';
      }
    })();

    const highlightedTarget = quickJumpReadOnlyMode ? quickJumpTargetKey : liveTarget;

    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tagConfig.map(({ label, target }) => {
          const enabled = isStageEnabled(target, quickJumpCurrentRank);
          const active = highlightedTarget === target;
          return (
            <button
              key={label}
              type="button"
              disabled={!enabled}
              onClick={() => goToStage(active ? null : target)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                !enabled && 'cursor-not-allowed opacity-50',
                active
                  ? 'border-primary/80 bg-primary/15 text-primary'
                  : 'border-primary/40 bg-primary/5 text-primary hover:border-primary/60',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border-border bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
      <WorkspaceHeader
        workspaceCase={workspaceWithNotifications}
        caseFlagged={caseFlagged}
        backHref={backHref}
        backLabel={backLabel}
        liveSyncing={liveSyncing}
        syncing={syncing}
        onOpenChat={() => setBottomNavTab('chat')}
        onToggleFlag={toggleFlag}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="border-border bg-muted/[0.2] shrink-0 overflow-y-auto border-b px-4 py-4 lg:w-[min(100%,240px)] lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="space-y-3">
            <WorkspaceSideInformationPanel
              tenantName={workspaceCase.tenant?.name ?? '—'}
              tenantEmail={workspaceCase.tenant?.email}
              tenantPhone={workspaceCase.tenant?.phone}
              priority={workspaceCase.priority}
              responsibility={workspaceCase.responsibility ?? null}
              sourceLabel={SOURCE_LABELS[workspaceCase.source]}
              statusBoxClassName={
                workspaceCase.status === 'pending_evidence'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border'
              }
              statusBoxContent={
                <p className="text-[11px] font-semibold text-foreground">{statusLabel}</p>
              }
            />
            <WorkspaceTimelinePanel entries={workspaceCase.auditEntries} />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {bottomNavTab === 'details' ? (
              <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-6">
                {renderStageTags()}

                <div>
                  <p className="text-muted-foreground mt-3 mb-3 text-[10px] font-semibold uppercase tracking-wider">
                    Workflow
                  </p>
                  <div className="flex w-full items-start justify-between gap-0 pb-1">
                    {steps.map((step, i) => {
                      const isPreviewStep =
                        quickJumpReadOnlyMode &&
                        quickJumpTargetKey === stepIdToTargetKey(step.id);
                      return (
                      <div key={step.id} className="flex flex-1 items-center justify-center">
                        <button
                          type="button"
                          disabled={step.status === 'upcoming'}
                          onClick={() => handleWorkflowStepClick(step.id, step.status)}
                          className={cn(
                            'flex min-w-[56px] flex-1 flex-col items-center focus:outline-none',
                            step.status === 'upcoming' && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <div
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full border-2 transition-colors',
                              isPreviewStep && 'ring-2 ring-primary/30',
                              step.tone === 'declined'
                                ? 'border-destructive bg-destructive/10 text-destructive'
                                : step.status === 'done'
                                  ? 'border-primary bg-primary/10'
                                  : step.status === 'active'
                                    ? 'border-primary bg-primary shadow-sm'
                                    : 'border-border bg-background',
                            )}
                          >
                            {step.tone === 'declined' ? (
                              <AlertTriangle className="size-3.5" />
                            ) : step.status === 'done' ? (
                              <CheckCircle2 className="text-primary size-3.5" />
                            ) : step.status === 'active' ? (
                              <div className="bg-primary-foreground size-2 rounded-full" />
                            ) : (
                              <Circle className="text-muted-foreground/30 size-3.5" />
                            )}
                          </div>
                          <p
                            className={cn(
                              'mt-2 text-center text-[10px] font-semibold leading-tight',
                              isPreviewStep || step.status === 'active'
                                ? 'text-primary'
                                : step.status === 'done'
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground/50',
                            )}
                          >
                            {step.label}
                          </p>
                        </button>
                        {i < steps.length - 1 && (
                          <div
                            className={cn(
                              'mb-4 h-0.5 flex-1',
                              step.status === 'done' ? 'bg-primary/40' : 'bg-border',
                            )}
                          />
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>

                {isReviewStep && (
                  <>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Problem Description
                      </p>
                      <p className="mt-2 text-sm font-medium whitespace-pre-wrap text-foreground">
                        {workspaceCase.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEvidenceExpanded((v) => !v)}
                      className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <span className="min-w-0 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Photo / Video Uploaded
                        </p>
                        <p className="text-muted-foreground mt-1 text-[12px] tabular-nums">0 items</p>
                      </span>
                      <ChevronDown
                        className={cn('size-4 transition-transform', evidenceExpanded && 'rotate-180')}
                      />
                    </button>
                    {evidenceExpanded && (
                      <div className="mt-3 rounded-lg border border-border bg-background p-3">
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-muted/30 flex h-10 items-center justify-center rounded-md border border-dashed border-border"
                            >
                              <FileText className="text-muted-foreground/30 size-4" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          CROSSUB Advice
                        </p>
                        <span className="text-muted-foreground text-[10px]">Reasoning only</span>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">Supporting reasoning:</p>
                      <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">{aiAdvice}</p>
                    </div>
                  </>
                )}

                <div className="rounded-xl border border-border bg-background">
                  <div
                    className={cn(
                      'rounded-t-xl border-b border-border px-4 py-3',
                      quickJumpReadOnlyMode || activeStep?.status === 'active'
                        ? 'bg-primary/5'
                        : 'bg-muted/30',
                    )}
                  >
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      {quickJumpReadOnlyMode ? 'Stage view' : 'Current Action'}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-sm font-semibold',
                        quickJumpReadOnlyMode || activeStep?.status === 'active'
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {displayActionLabel}
                    </p>
                    {displayActionSublabel && (
                      <p className="text-muted-foreground text-[11px]">{displayActionSublabel}</p>
                    )}
                  </div>

                  <div
                    className={cn(
                      'space-y-3 p-4',
                      quickJumpReadOnlyMode && 'pointer-events-none opacity-95',
                    )}
                  >
                    {quickJumpReadOnlyMode && quickJumpTargetKey && (
                      <div className="pointer-events-auto mb-3 rounded-lg border border-border bg-background px-3 py-2">
                        <p className="text-xs font-semibold text-muted-foreground">Quick view: read-only</p>
                        <p className="text-muted-foreground mt-1 text-[11px]">
                          Review historical data for this stage. Click the active workflow step to return to live actions.
                        </p>
                      </div>
                    )}

                    {quickJumpReadOnlyMode && quickJumpTargetKey ? (
                      <div className="pointer-events-auto">
                        <WorkflowStepPreview
                          target={quickJumpTargetKey}
                          workspaceCase={workspaceCase}
                          aiAdvice={aiAdvice}
                        />
                      </div>
                    ) : (
                      <>
                    {uiStatusForUI === 'under_review' && (
                      <>
                        <p className="text-muted-foreground text-xs">
                          Assign who is responsible for this issue:
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['tenant', 'landlord', 'strata'] as const).map((r) => {
                            const icons = { tenant: User, landlord: Building2, strata: Shield };
                            const Icon = icons[r];
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setPendingResponsibility(r)}
                                className={cn(
                                  'flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium capitalize transition-colors',
                                  pendingResponsibility === r
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:bg-secondary',
                                )}
                              >
                                <Icon className="size-4" />
                                {r}
                              </button>
                            );
                          })}
                        </div>

                        <div className="rounded-xl border border-border bg-background p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Requesting More Evidence
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Request additional details before proceeding.
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0"
                              onClick={() => setMoreEvidenceOpen((v) => !v)}
                            >
                              Request More Evidence
                            </Button>
                          </div>
                          {moreEvidenceOpen && (
                            <p className="text-muted-foreground mt-3 text-xs">
                              Evidence request will be sent to the tenant via app and email.
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          disabled={!pendingResponsibility}
                          onClick={() => {
                            toast.success(
                              `Responsibility set to ${pendingResponsibility} — message will be sent`,
                            );
                          }}
                        >
                          Confirm Responsibility &amp; Send Message
                        </Button>
                      </>
                    )}

                    {uiStatusForUI === 'pending_approval' && requiresApproval && (
                      <ApprovalPanel
                        title={workspaceCase.issueType}
                        amount={quoteAmount}
                        contractor={contractorName}
                        expiry={quoteExpiry}
                        recommendation={recommendation}
                        quoteDocumentUrl={quoteDocumentUrl}
                        disabled={!requiresApproval}
                        onApprove={() => void onApproveQuote?.()}
                        onDecline={(r) => void onDeclineQuote?.(r)}
                        onRequote={(r) => void onDeclineQuote?.(`Requote requested: ${r}`)}
                      />
                    )}

                    {uiStatusForUI === 'pending_quotation' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                            Contractor response
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {contractorName ?? 'Awaiting contractor assignment'}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {remindersSent > 0 ? (
                              <>
                                {remindersSent} reminder{remindersSent === 1 ? '' : 's'} sent.
                                {reminderEta ? ` Next reminder ${reminderEta}.` : ' '}
                                Reminders every 4 hours per contractor (up to 3 each).
                              </>
                            ) : reminderEta ? (
                              <>Reminder will be sent {reminderEta}. Reminders every 4 hours per contractor.</>
                            ) : (
                              <>Awaiting contractor quote submission — reminders every 4 hours.</>
                            )}
                          </p>
                        </div>
                        {quoteAmount != null && (
                          <p className="text-sm font-medium text-foreground">
                            Latest quote: {formatCurrency(quoteAmount)}
                          </p>
                        )}
                      </div>
                    )}

                    {uiStatusForUI === 'in_progress' && (
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Completion evidence</dt>
                          <dd className="font-medium">
                            {workspaceCase.completionEvidenceUploaded ? 'Uploaded' : 'Pending'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Invoice</dt>
                          <dd className="font-medium">
                            {workspaceCase.invoiceUploaded ? 'Sent' : 'Pending'}
                          </dd>
                        </div>
                      </dl>
                    )}

                    {uiStatusForUI === 'closed' && (
                      <p className="text-muted-foreground text-sm">This maintenance case is closed.</p>
                    )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <WorkspaceChatPanel
                workspaceCase={workspaceWithNotifications}
                agentName={workspaceCase.agent?.name ?? 'Agent'}
              />
            )}
          </div>
        </div>
      </div>

      <WorkspaceBottomNav bottomNavTab={bottomNavTab} setBottomNavTab={setBottomNavTab} />
    </div>
  );
}
