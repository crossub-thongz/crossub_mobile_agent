'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import {
  RegisterAgreementsSection,
  registerAgreementsReady,
} from '@/components/register/register-agreements-section';
import {
  FullServiceFeeExample,
  FullServicePricingDetails,
} from '@/components/register/register-full-service-details';
import {
  fetchRegisterAgentPricing,
  registerRequiresServiceAgreement,
} from '@/lib/agent-registration';
import {
  openInspectionRateLabel,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
import {
  isInspectionOnlyLevel,
  isSelfManagedLevel,
  REGISTER_SERVICE_LEVEL_DESCRIPTION,
  REGISTER_SERVICE_LEVEL_LABEL,
  REGISTER_SERVICE_LEVEL_PRICE_TAG,
  type RegisterablePortalServiceLevel,
} from '@/lib/portal-service-level';
import { formatCurrency } from '@/lib/utils';

type RegistrationPricingCatalog = Omit<AgentBillingPricingCatalog, 'portalServiceLevel'>;

export type AgentRegistrationSummary = {
  firstName: string;
  lastName: string;
  email: string;
  agencyName: string;
  agencyCompany?: string;
  phone?: string;
  abn?: string;
  licenceNumber?: string;
  officeAddress?: string;
};

export function RegisterConfirmPanel({
  summary,
  portalServiceLevel,
  acceptServiceAgreement,
  acceptPrivacyAgreement,
  onAcceptServiceAgreementChange,
  onAcceptPrivacyAgreementChange,
}: {
  summary: AgentRegistrationSummary;
  portalServiceLevel: RegisterablePortalServiceLevel;
  acceptServiceAgreement: boolean;
  acceptPrivacyAgreement: boolean;
  onAcceptServiceAgreementChange: (value: boolean) => void;
  onAcceptPrivacyAgreementChange: (value: boolean) => void;
}) {
  const isInspectionOnly = isInspectionOnlyLevel(portalServiceLevel);
  const isSelfManaged = isSelfManagedLevel(portalServiceLevel);

  const [catalog, setCatalog] = useState<RegistrationPricingCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchRegisterAgentPricing()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <PortalServiceLevelBadge level={portalServiceLevel} variant="level" size="sm" />
          <p className="text-sm font-semibold">
            {REGISTER_SERVICE_LEVEL_LABEL[portalServiceLevel]}
          </p>
          {isSelfManaged ? null : (
            <span className="text-muted-foreground text-xs font-medium">
              {REGISTER_SERVICE_LEVEL_PRICE_TAG[portalServiceLevel]}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {REGISTER_SERVICE_LEVEL_DESCRIPTION[portalServiceLevel]}
        </p>

        {isSelfManaged ? (
          <ul className="text-muted-foreground mt-4 space-y-1.5 text-xs leading-relaxed">
            <li>No platform fees and no card needed</li>
            <li>Owners get an emailed copy of your decisions</li>
            <li>Add Inspection Only or Full Service later from Settings</li>
          </ul>
        ) : null}

        {!isSelfManaged && catalogLoading ? (
          <div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading service details…
          </div>
        ) : null}

        {catalog && !isInspectionOnly && !isSelfManaged ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              <span className="font-semibold text-foreground">
                {catalog.level2.serviceFeePercent}% platform fee
              </span>
              <span className="text-muted-foreground">
                {' '}
                of your management income · min 4% rate · billed by active days
              </span>
            </p>
            <FullServiceFeeExample catalog={catalog} />
            <FullServicePricingDetails catalog={catalog} omitFeeExample />
          </div>
        ) : null}

        {catalog && isInspectionOnly ? (
          <ul className="text-muted-foreground mt-4 space-y-1.5 text-xs leading-relaxed">
            <li>
              Routine inspection from{' '}
              <strong className="text-foreground">
                {formatCurrency(catalog.inspections.routineIncGstAud)}
              </strong>{' '}
              (inc GST)
            </li>
            <li>
              Open inspections (when CROSSUB conducts):{' '}
              <strong className="text-foreground">
                {openInspectionRateLabel(catalog.inspections.openInspection)}
              </strong>
            </li>
            <li>Prepaid — pay when you place the inspection order</li>
            <li>Inspection module only — upgrade to Full Service anytime</li>
          </ul>
        ) : null}
      </section>

      <RegisterAgreementsSection
        summary={{
          ...summary,
          licenceNumber: summary.licenceNumber?.trim() || 'Pending',
        }}
        acceptServiceAgreement={acceptServiceAgreement}
        acceptPrivacyAgreement={acceptPrivacyAgreement}
        onAcceptServiceAgreementChange={onAcceptServiceAgreementChange}
        onAcceptPrivacyAgreementChange={onAcceptPrivacyAgreementChange}
        showServiceAgreement={registerRequiresServiceAgreement(portalServiceLevel)}
      />
    </div>
  );
}

export function registerConfirmReady({
  portalServiceLevel,
  acceptServiceAgreement,
  acceptPrivacyAgreement,
}: {
  portalServiceLevel: RegisterablePortalServiceLevel;
  acceptServiceAgreement: boolean;
  acceptPrivacyAgreement: boolean;
}): boolean {
  return registerAgreementsReady(
    acceptServiceAgreement,
    acceptPrivacyAgreement,
    registerRequiresServiceAgreement(portalServiceLevel),
  );
}
