'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MaintenanceInlineActions } from '@/components/agent/maintenance-inline-actions';
import {
  WorkflowProgressRail,
} from '@/components/agent/workflow-progress-rail';
import { WorkflowStepPreview } from '@/components/maintenance-workspace/workflow-step-preview';
import { useAuth } from '@/components/providers/auth-provider';
import { maintenanceDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { generateWorkspaceAdvice } from '@/lib/maintenance-workspace/advice';
import { buildWorkspaceCaseFromRequest } from '@/lib/maintenance-workspace/adapter';
import { stepIdToTargetKey } from '@/lib/maintenance-workspace/quick-jump';
import { STATUS_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceWorkspaceStatus } from '@/lib/maintenance-workspace/types';
import { getWorkflowSteps, resolveLiveWorkflowStep } from '@/lib/maintenance-workspace/workflow-model';
import { maintenanceStepShortLabel } from '@/lib/property-maintenance-job';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

function MaintenanceJobHeader({ item }: { item: MaintenanceRequest }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-primary text-[10px] font-semibold uppercase tracking-wide">
        {item.trackingNumber || 'Maintenance job'}
      </p>
      <p className="mt-0.5 text-base font-semibold leading-tight">{item.title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{item.status}</p>
    </div>
  );
}

function LiveStepContent({
  item,
  status,
}: {
  item: MaintenanceRequest;
  status: MaintenanceWorkspaceStatus;
}) {
  if (status === 'under_review' || status === 'pending_evidence') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Problem description
          </p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{item.description}</p>
        </div>
        <p className="text-muted-foreground text-xs">
          CROSSUB is reviewing responsibility and evidence. Open the full job workspace to assign
          responsibility or request more evidence.
        </p>
      </div>
    );
  }

  if (status === 'pending_quotation') {
    return (
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        Awaiting contractor quotation
        {item.contractorName ? ` from ${item.contractorName}` : ''}.
      </p>
    );
  }

  if (status === 'pending_approval') {
    return (
      <div className="space-y-3">
        {item.requiresApproval ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div>
              <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                Approval required
              </p>
              {item.contractorName ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Contractor: {item.contractorName}
                </p>
              ) : null}
              {item.quoteAmount != null ? (
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.quoteAmount)} inc GST
                </p>
              ) : null}
              {item.recommendation ? (
                <p className="text-muted-foreground mt-2 text-xs">{item.recommendation}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <MaintenanceInlineActions item={item} />
      </div>
    );
  }

  if (status === 'in_progress' || status === 'completed') {
    return (
      <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Contractor</dt>
          <dd className="font-medium">{item.contractorName ?? '—'}</dd>
        </div>
        {item.quoteAmount != null && (
          <div>
            <dt className="text-muted-foreground">Approved quote</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(item.quoteAmount)}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Completion evidence</dt>
          <dd className="font-medium">
            {item.completionEvidenceUploaded ? 'Uploaded' : 'Pending'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Invoice</dt>
          <dd className="font-medium">{item.invoiceUploaded ? 'Sent' : 'Pending'}</dd>
        </div>
      </dl>
    );
  }

  return (
    <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
      This maintenance case is closed.
    </p>
  );
}

export function PropertyMaintenanceJobPanel({
  item,
  property,
  propertyId,
}: {
  item: MaintenanceRequest;
  property: Property;
  propertyId: string;
}) {
  const { user } = useAuth();
  const workspaceCase = useMemo(
    () => buildWorkspaceCaseFromRequest(item, property, user),
    [item, property, user],
  );
  const steps = useMemo(
    () => getWorkflowSteps(workspaceCase, workspaceCase.quotations),
    [workspaceCase],
  );
  const liveActiveStep = useMemo(() => resolveLiveWorkflowStep(steps), [steps]);
  const [viewingStepId, setViewingStepId] = useState(liveActiveStep?.id ?? 'created');
  const initializedRef = useRef<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');

  useEffect(() => {
    setAiAdvice(generateWorkspaceAdvice(workspaceCase));
  }, [workspaceCase]);

  useEffect(() => {
    if (initializedRef.current !== item.id) {
      setViewingStepId(liveActiveStep?.id ?? 'created');
      initializedRef.current = item.id;
    }
  }, [item.id, liveActiveStep?.id]);

  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const labels = useMemo(
    () =>
      Object.fromEntries(
        steps.map((s) => [s.id, maintenanceStepShortLabel(s.id, s.label)]),
      ) as Record<string, string>,
    [steps],
  );

  const viewingStep = steps.find((s) => s.id === viewingStepId);
  const isLiveStep = viewingStepId === liveActiveStep?.id;
  const previewTarget = stepIdToTargetKey(viewingStepId);
  const statusLabel = STATUS_LABELS[workspaceCase.status] ?? workspaceCase.status;

  return (
    <div className="space-y-4">
      <MaintenanceJobHeader item={item} />

      <WorkflowProgressRail
        steps={stepIds}
        labels={labels}
        currentStep={viewingStepId}
        getStepState={(stepId) => {
          const step = steps.find((s) => s.id === stepId);
          if (!step) return 'upcoming';
          if (stepId === viewingStepId) return 'current';
          if (step.status === 'done') return 'completed';
          if (step.status === 'active') return 'current';
          return 'upcoming';
        }}
        isStepCompleted={(stepId) =>
          steps.find((s) => s.id === stepId)?.status === 'done'
        }
        isStepEnabled={(stepId) => {
          const step = steps.find((s) => s.id === stepId);
          return step != null && step.status !== 'upcoming';
        }}
        onStepClick={setViewingStepId}
      />

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {isLiveStep ? 'Current step' : 'Step history'}
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {viewingStep?.label ?? '—'}
          </p>
          {viewingStep?.sublabel ? (
            <p className="text-muted-foreground text-xs">{viewingStep.sublabel}</p>
          ) : null}
          {isLiveStep ? (
            <p className="text-primary mt-1 text-[11px] font-medium">{statusLabel}</p>
          ) : null}
        </div>
        <div className="p-4">
          {isLiveStep ? (
            <LiveStepContent item={item} status={workspaceCase.status} />
          ) : previewTarget ? (
            <WorkflowStepPreview
              target={previewTarget}
              workspaceCase={workspaceCase}
              aiAdvice={aiAdvice}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No details for this step.</p>
          )}
        </div>
      </div>

      <Link
        href={maintenanceDetail(item.id, fromProperty(propertyId, 'Maintenance'))}
        className="text-primary block text-center text-xs font-medium"
      >
        Open full maintenance workspace →
      </Link>
    </div>
  );
}
