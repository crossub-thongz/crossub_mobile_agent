'use client';

import { useMemo, useState } from 'react';
import { Check, Download, Eye, User, X } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentViewer } from '@/components/agent/document-viewer';
import { Button } from '@/components/ui/button';
import {
  getLeasingApplicants,
  type LeasingApplication,
  type LeasingApplicationDocument,
} from '@/lib/leasing-applicants';
import { useAgentStore } from '@/lib/store';
import {
  tenantSelectionDecisionKey,
  type TenantSelectionDecision,
} from '@/lib/tenant-selection';
import type { TenantSelectionCase } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type View = 'list' | 'applicant' | 'document';

export function ApplicantListDialog({
  open,
  onClose,
  propertyId,
  propertyAddress,
  proposedRent,
  applicationCount,
  selection,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress?: string;
  proposedRent?: number;
  applicationCount?: number;
  selection?: TenantSelectionCase;
}) {
  const [view, setView] = useState<View>('list');
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<LeasingApplicationDocument | null>(
    null,
  );

  const setTenantSelectionDecision = useAgentStore((s) => s.setTenantSelectionDecision);
  const tenantSelectionDecisions = useAgentStore((s) => s.tenantSelectionDecisions);

  const decisionKey = tenantSelectionDecisionKey(propertyId, selection?.id);
  const existingDecision = tenantSelectionDecisions[decisionKey];

  const applicants = useMemo(
    () =>
      getLeasingApplicants({
        propertyId,
        applicationCount,
        selection,
      }),
    [propertyId, applicationCount, selection],
  );

  const applicant = applicants.find((a) => a.id === selectedApplicantId);
  const address = propertyAddress ?? selection?.propertyAddress ?? '—';
  const rent = proposedRent ?? selection?.proposedRent;

  const recordDecision = (action: TenantSelectionDecision['action'], applicantName: string) => {
    const applicantId = applicants.find((a) => a.name === applicantName)?.id;
    setTenantSelectionDecision(decisionKey, {
      action,
      applicantName,
      applicantId,
      decidedAt: new Date().toISOString(),
    });
  };

  const reset = () => {
    setView('list');
    setSelectedApplicantId(null);
    setSelectedDocument(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-background flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">
              {view === 'document'
                ? 'Application document'
                : view === 'applicant'
                  ? 'Applicant details'
                  : 'Applications received'}
            </h2>
            <p className="text-muted-foreground text-xs">{address}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {existingDecision && view === 'list' && (
            <div className="bg-primary/5 border-primary/20 mb-3 rounded-lg border px-3 py-2 text-xs">
              <p className="text-primary font-semibold">
                {existingDecision.action === 'approved' ? 'Application approved' : 'Application declined'}
              </p>
              <p className="text-muted-foreground mt-1">
                {existingDecision.applicantName} · {formatDateTime(existingDecision.decidedAt)}
              </p>
            </div>
          )}
          {view === 'document' && selectedDocument && applicant ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setView('applicant');
                  setSelectedDocument(null);
                }}
                className="text-primary text-xs font-medium"
              >
                ← Back to {applicant.name}
              </button>
              <DocumentViewer
                title={selectedDocument.name}
                propertyAddress={address}
                category="application"
                downloadUrl={selectedDocument.downloadUrl}
              />
            </div>
          ) : view === 'applicant' && applicant ? (
            <ApplicantDetail
              applicant={applicant}
              proposedRent={rent}
              decision={existingDecision}
              isApprovedApplicant={
                existingDecision?.action === 'approved' &&
                existingDecision.applicantName === applicant.name
              }
              onBack={() => {
                setView('list');
                setSelectedApplicantId(null);
              }}
              onViewDocument={(doc) => {
                setSelectedDocument(doc);
                setView('document');
              }}
              onApprove={() => {
                recordDecision('approved', applicant.name);
                toast.success(`${applicant.name} approved — lease communication triggered`);
                handleClose();
              }}
              onReject={() => {
                recordDecision('rejected', applicant.name);
                toast.info(`${applicant.name} declined`);
                handleClose();
              }}
            />
          ) : (
            <ul className="space-y-2">
              {applicants.map((a) => {
                const isApproved =
                  existingDecision?.action === 'approved' &&
                  existingDecision.applicantName === a.name;
                return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApplicantId(a.id);
                      setView('applicant');
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm hover:border-primary/30"
                  >
                    <div className="bg-secondary flex size-8 items-center justify-center rounded-lg">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.name}</p>
                        {isApproved && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            Approved
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {a.score} · {a.income}
                        {a.submittedAt ? ` · ${formatDateTime(a.submittedAt)}` : ''}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {a.documents.length} document{a.documents.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicantDetail({
  applicant,
  proposedRent,
  decision,
  isApprovedApplicant,
  onBack,
  onViewDocument,
  onApprove,
  onReject,
}: {
  applicant: LeasingApplication;
  proposedRent?: number;
  decision?: TenantSelectionDecision;
  isApprovedApplicant?: boolean;
  onBack: () => void;
  onViewDocument: (doc: LeasingApplicationDocument) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const decided = !!decision;
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="text-primary text-xs font-medium">
        ← Back to list
      </button>
      <div className="rounded-xl border p-4">
        <p className="font-semibold">{applicant.name}</p>
        <p className="text-muted-foreground text-xs">{applicant.email}</p>
        <dl className="mt-3 space-y-2 text-xs">
          {proposedRent != null && (
            <div>
              <dt className="text-muted-foreground">Proposed rent</dt>
              <dd className="font-medium">{formatCurrency(proposedRent)}/wk</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Household income</dt>
            <dd>{applicant.income}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reference score</dt>
            <dd>{applicant.score}</dd>
          </div>
          {applicant.submittedAt && (
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{formatDateTime(applicant.submittedAt)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Documents
          </p>
          <ul className="space-y-2">
            {applicant.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate font-medium">{doc.name}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => onViewDocument(doc)}
                  >
                    <Eye className="size-3" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" asChild>
                    <a href={doc.downloadUrl} download={doc.name}>
                      <Download className="size-3" />
                      Download
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex gap-2">
          {decided ? (
            <p className="text-muted-foreground text-xs">
              {isApprovedApplicant
                ? 'This applicant was approved.'
                : decision?.action === 'rejected' && decision.applicantName === applicant.name
                  ? 'This applicant was declined.'
                  : `Decision recorded for ${decision?.applicantName}.`}
            </p>
          ) : (
            <>
              <Button size="sm" className="flex-1" onClick={onApprove}>
                <Check className="size-3.5" />
                Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={onReject}>
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
