'use client';

import { Label } from '@/components/ui/label';
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
}: {
  summary: AgentSummary;
  portalServiceLevel: AgentPortalServiceLevel;
  acceptTerms: boolean;
  onAcceptTermsChange: (value: boolean) => void;
}) {
  const isInspectionOnly = isInspectionOnlyLevel(portalServiceLevel);

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
        <p className="font-medium text-foreground">Terms &amp; conditions</p>
        <p className="text-muted-foreground mt-2">
          By registering you agree to the CROSSUB terms of service and privacy policy. After your
          account is created, you will be prompted on first login to accept the{' '}
          <strong className="text-foreground">System Access Agreement</strong>
          {isInspectionOnly ? (
            <> before using the Agent Portal.</>
          ) : (
            <>
              . You will then preview, sign, and upload your{' '}
              <strong className="text-foreground">CROSSUB Service Agreement (NSW)</strong> on first
              login — CROSSUB staff will review it in the admin portal.
            </>
          )}
        </p>
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
          I accept the CROSSUB terms &amp; conditions
        </Label>
      </div>
    </div>
  );
}

export function registerConfirmReady({ acceptTerms }: { acceptTerms: boolean }): boolean {
  return acceptTerms;
}
