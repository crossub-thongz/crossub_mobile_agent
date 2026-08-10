'use client';

import { Eye, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
} from '@/lib/agent-registration';
import {
  isInspectionOnlyLevel,
  REGISTER_SERVICE_LEVEL_LABEL,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { api } from '@/lib/api';
import type { SystemAccessAgreementView } from '@/lib/system-access-agreement';

type AgentSummary = {
  firstName: string;
  lastName: string;
  email: string;
  agencyName: string;
  agencyCompany?: string;
};

export function RegisterConfirmPanel({
  summary,
  portalServiceLevel,
  acceptTerms,
  onAcceptTermsChange,
}: {
  summary: AgentSummary;
  portalServiceLevel: AgentPortalServiceLevel;
  acceptTerms: boolean;
  onAcceptTermsChange: (value: boolean) => void;
}) {
  const isInspectionOnly = isInspectionOnlyLevel(portalServiceLevel);
  const [agreementMeta, setAgreementMeta] = useState<SystemAccessAgreementView | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const documentHref = `/api${REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH}`;

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<SystemAccessAgreementView>(
          REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
        );
        setAgreementMeta(data);
      } catch {
        setAgreementMeta(null);
      }
    })();
  }, []);

  const agreementTitle =
    agreementMeta?.title ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.title;
  const agreementFileName =
    agreementMeta?.fileName ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.fileName;
  const agreementVersion =
    agreementMeta?.version ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.version;

  const previewDoc = useMemo<DocumentPreviewItem>(
    () => ({
      title: agreementTitle,
      fileName: agreementFileName,
      downloadFileName: agreementFileName,
      href: documentHref,
    }),
    [agreementFileName, agreementTitle, documentHref],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-secondary/20 p-4 text-sm">
        <p className="font-medium">
          {summary.firstName} {summary.lastName}
        </p>
        <p className="text-muted-foreground">{summary.email}</p>
        <p className="text-muted-foreground mt-2">{summary.agencyName}</p>
        {summary.agencyCompany ? (
          <p className="text-muted-foreground text-xs">{summary.agencyCompany}</p>
        ) : null}
        <p className="mt-3 text-sm font-medium">
          {REGISTER_SERVICE_LEVEL_LABEL[portalServiceLevel]}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
        <p className="font-medium text-foreground">Terms &amp; system access agreement</p>
        <p className="text-muted-foreground mt-2">
          By registering you agree to the CROSSUB terms of service, privacy policy, and the
          agency portal access agreement below. Your acceptance is recorded once — you will not
          be asked to sign again after registration
          {!isInspectionOnly ? (
            <>
              . On first login you will preview, sign, and upload your{' '}
              <strong className="text-foreground">CROSSUB Service Agreement (NSW)</strong> — CROSSUB
              staff will review it in the admin portal
            </>
          ) : null}
          .
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">System Access Agreement</p>
              <p className="mt-1 text-sm text-foreground">{agreementTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Version {agreementVersion} · {agreementFileName}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-1.5 size-3.5" />
            Preview
          </Button>
        </div>
      </div>

      <DocumentPreviewDialog
        doc={previewDoc}
        subtitle="Agency portal registration"
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="acceptTerms"
          className="mt-1 size-4 rounded border-border"
          checked={acceptTerms}
          onChange={(event) => onAcceptTermsChange(event.target.checked)}
        />
        <Label htmlFor="acceptTerms" className="text-sm leading-snug">
          I accept the CROSSUB terms &amp; conditions and the agency portal system access
          agreement
        </Label>
      </div>
    </div>
  );
}

export function registerConfirmReady({ acceptTerms }: { acceptTerms: boolean }): boolean {
  return acceptTerms;
}
