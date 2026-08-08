'use client';

import { Download, FileSignature, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH } from '@/lib/agent-registration';
import {
  isInspectionOnlyLevel,
  REGISTER_SERVICE_LEVEL_LABEL,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';

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
  acceptSystemAccessAgreement,
  onAcceptSystemAccessAgreementChange,
  signedServiceAgreementFile,
  onSignedServiceAgreementFileChange,
}: {
  summary: AgentSummary;
  portalServiceLevel: AgentPortalServiceLevel;
  acceptTerms: boolean;
  onAcceptTermsChange: (value: boolean) => void;
  acceptSystemAccessAgreement: boolean;
  onAcceptSystemAccessAgreementChange: (value: boolean) => void;
  signedServiceAgreementFile: File | null;
  onSignedServiceAgreementFileChange: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInspectionOnly = isInspectionOnlyLevel(portalServiceLevel);
  const templateHref = `/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`;

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

      {isInspectionOnly ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
          <p className="font-medium text-foreground">Terms &amp; conditions</p>
          <p className="text-muted-foreground mt-2">
            By registering you agree to the CROSSUB terms of service and privacy policy. After
            your account is created, you will be asked to accept the{' '}
            <strong className="text-foreground">System Access Agreement</strong> before using the
            Agent Portal.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
            <p className="font-medium text-foreground">Agreements required for Full Service</p>
            <p className="text-muted-foreground mt-2">
              Full Service registration requires acceptance of the CROSSUB terms, the System Access
              Agreement, and a signed CROSSUB Service Agreement (NSW).
            </p>
          </div>

          <div className="rounded-lg border border-violet-500/25 bg-violet-500/8 p-4 text-sm">
            <div className="flex items-start gap-3">
              <FileSignature className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-medium">CROSSUB Service Agreement (NSW)</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Download the template, sign offline, then upload the signed PDF to complete
                    registration. Your portal access will unlock once CROSSUB approves the signed
                    copy.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={templateHref} download>
                    <Download className="mr-1.5 size-3.5" />
                    Download template
                  </a>
                </Button>
                <div className="space-y-2">
                  <Label htmlFor="signed-service-agreement">Signed agreement (required)</Label>
                  <input
                    ref={fileInputRef}
                    id="signed-service-agreement"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) =>
                      onSignedServiceAgreementFileChange(event.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    {signedServiceAgreementFile
                      ? signedServiceAgreementFile.name
                      : 'Upload signed PDF'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="acceptTerms"
            className="mt-1 size-4 rounded border-border"
            checked={acceptTerms}
            onChange={(event) => onAcceptTermsChange(event.target.checked)}
          />
          <Label htmlFor="acceptTerms" className="text-sm leading-snug">
            I accept the CROSSUB terms &amp; conditions
            {isInspectionOnly ? null : ' and privacy policy'}
          </Label>
        </div>

        {!isInspectionOnly ? (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptSystemAccessAgreement"
              className="mt-1 size-4 rounded border-border"
              checked={acceptSystemAccessAgreement}
              onChange={(event) => onAcceptSystemAccessAgreementChange(event.target.checked)}
            />
            <Label htmlFor="acceptSystemAccessAgreement" className="text-sm leading-snug">
              I accept the CROSSUB System Access Agreement
            </Label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function registerConfirmReady({
  portalServiceLevel,
  acceptTerms,
  acceptSystemAccessAgreement,
  signedServiceAgreementFile,
}: {
  portalServiceLevel: AgentPortalServiceLevel;
  acceptTerms: boolean;
  acceptSystemAccessAgreement: boolean;
  signedServiceAgreementFile: File | null;
}): boolean {
  if (!acceptTerms) return false;
  if (isInspectionOnlyLevel(portalServiceLevel)) return true;
  return acceptSystemAccessAgreement && signedServiceAgreementFile != null;
}
