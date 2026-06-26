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
import { SOURCE_LABELS, STATUS_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceWorkspaceCase, WorkspaceResponsibility } from '@/lib/maintenance-workspace/types';
import { getWorkflowSteps } from '@/lib/maintenance-workspace/workflow-model';
import { cn, formatCurrency } from '@/lib/utils';

// import { WorkspaceBottomNav } from './bottom-nav';
import { WorkspaceTimelinePanel } from './audit-timeline';
import { WorkspaceSideInformationPanel } from './side-information-panel';
import { WorkspaceHeader } from './workspace-header';

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
}) {
  const [bottomNavTab, setBottomNavTab] = useState<'details' | 'chat'>('details');
  const [caseFlagged, setCaseFlagged] = useState(false);
  const [pendingResponsibility, setPendingResponsibility] = useState<WorkspaceResponsibility | null>(
    workspaceCase.responsibility ?? null,
  );
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [moreEvidenceOpen, setMoreEvidenceOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');

  const steps = useMemo(
    () => getWorkflowSteps(workspaceCase, workspaceCase.quotations),
    [workspaceCase],
  );
  const activeStep = steps.find((s) => s.status === 'active') ?? steps[steps.length - 1];
  const statusLabel = STATUS_LABELS[workspaceCase.status] ?? workspaceCase.status;
  const isReviewStep =
    workspaceCase.status === 'under_review' || workspaceCase.status === 'pending_evidence';

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
    const tags =
      workspaceCase.responsibility === 'tenant'
        ? ['REVIEW', 'IN PROGRESS', 'COMPLETE']
        : workspaceCase.responsibility === 'strata'
          ? ['REVIEW', 'IN PROGRESS', 'COMPLETE']
          : ['REVIEW', 'PENDING QUOTATION', 'PENDING APPROVAL', 'IN PROGRESS', 'COMPLETE'];

    const activeTag = (() => {
      switch (workspaceCase.status) {
        case 'under_review':
        case 'pending_evidence':
          return 'REVIEW';
        case 'pending_quotation':
          return 'PENDING QUOTATION';
        case 'pending_approval':
          return 'PENDING APPROVAL';
        case 'in_progress':
          return 'IN PROGRESS';
        case 'completed':
        case 'closed':
          return 'COMPLETE';
        default:
          return 'REVIEW';
      }
    })();

    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold',
              tag === activeTag
                ? 'border-primary/80 bg-primary/15 text-primary'
                : 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="border-border bg-background flex flex-col overflow-hidden rounded-xl border">
      <WorkspaceHeader
        workspaceCase={workspaceCase}
        caseFlagged={caseFlagged}
        backHref={backHref}
        backLabel={backLabel}
        onOpenChat={() => setBottomNavTab('chat')}
        onToggleFlag={toggleFlag}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="border-border bg-muted/[0.2] max-h-[42vh] shrink-0 overflow-y-auto border-b px-4 py-4 lg:max-h-none lg:w-[35%] lg:min-w-[240px] lg:max-w-md lg:border-r lg:border-b-0">
          <div className="space-y-3">
            <WorkspaceSideInformationPanel
              tenantName={workspaceCase.tenant?.name ?? '—'}
              tenantEmail={workspaceCase.tenant?.email}
              tenantPhone={workspaceCase.tenant?.phone}
              agentName={workspaceCase.agent?.name ?? '—'}
              agentEmail={workspaceCase.agent?.email}
              agentContact={workspaceCase.agent?.phone}
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
              <div className="space-y-5 px-4 py-5 pb-5 sm:px-5 sm:py-6 sm:pb-6">
                {renderStageTags()}

                <div>
                  <p className="text-muted-foreground mt-3 mb-3 text-[10px] font-semibold uppercase tracking-wider">
                    Workflow
                  </p>
                  <div className="flex w-full items-start justify-between gap-0 pb-1">
                    {steps.map((step, i) => (
                      <div key={step.id} className="flex flex-1 items-center justify-center">
                        <div className="flex min-w-[56px] flex-1 flex-col items-center">
                          <div
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full border-2 transition-colors',
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
                              step.status === 'active'
                                ? 'text-primary'
                                : step.status === 'done'
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground/50',
                            )}
                          >
                            {step.label}
                          </p>
                        </div>
                        {i < steps.length - 1 && (
                          <div
                            className={cn(
                              'mb-4 h-0.5 flex-1',
                              step.status === 'done' ? 'bg-primary/40' : 'bg-border',
                            )}
                          />
                        )}
                      </div>
                    ))}
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
                      activeStep?.status === 'active' ? 'bg-primary/5' : 'bg-muted/30',
                    )}
                  >
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      Current Action
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-sm font-semibold',
                        activeStep?.status === 'active' ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {activeStep?.label ?? '—'}
                    </p>
                    {activeStep?.sublabel && (
                      <p className="text-muted-foreground text-[11px]">{activeStep.sublabel}</p>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    {workspaceCase.status === 'under_review' && (
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

                    {workspaceCase.status === 'pending_approval' && requiresApproval && (
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

                    {workspaceCase.status === 'pending_quotation' && (
                      <p className="text-muted-foreground text-sm">
                        Awaiting contractor quotation
                        {contractorName ? ` from ${contractorName}` : ''}.
                        {quoteAmount != null && (
                          <span className="mt-1 block font-medium text-foreground">
                            Latest quote: {formatCurrency(quoteAmount)}
                          </span>
                        )}
                      </p>
                    )}

                    {workspaceCase.status === 'in_progress' && (
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

                    {workspaceCase.status === 'closed' && (
                      <p className="text-muted-foreground text-sm">This maintenance case is closed.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-4 py-5 sm:px-5 sm:py-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Communications transcript
                </p>
                {workspaceCase.notifications.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                    No messages yet for this case.
                  </p>
                ) : (
                  workspaceCase.notifications.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <span className="text-muted-foreground text-[10px] uppercase">{n.channel}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Case / Chat bottom nav — hidden for now; workspace shows Case content by default */}
          {/* <WorkspaceBottomNav bottomNavTab={bottomNavTab} setBottomNavTab={setBottomNavTab} /> */}
        </div>
      </div>
    </div>
  );
}
