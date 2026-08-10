'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Label } from '@/components/ui/label';
import {
  REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH,
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
  const [agreement, setAgreement] = useState<SystemAccessAgreementView | null>(null);
  const [loadingAgreement, setLoadingAgreement] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<SystemAccessAgreementView>(
          REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
        );
        setAgreement(data);
      } catch {
        setAgreement(null);
      } finally {
        setLoadingAgreement(false);
      }
    })();
  }, []);

  const documentHref = `/api${REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH}`;

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
        <p className="text-sm font-medium text-foreground">System Access Agreement</p>
        {loadingAgreement ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading agreement…
          </div>
        ) : agreement ? (
          <div className="mt-3 flex items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{agreement.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Version {agreement.version} · {agreement.fileName}
              </p>
              <a
                href={documentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Open agreement document
              </a>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            Unable to load the agreement preview. You can still continue — the document will be
            available after registration.
          </p>
        )}
      </div>

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
