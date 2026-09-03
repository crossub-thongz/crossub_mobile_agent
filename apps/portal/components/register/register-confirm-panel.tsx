'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import {
  FullServiceFeeExample,
  FullServicePricingDetails,
} from '@/components/register/register-full-service-details';
import {
  fetchRegisterAgentPricing,
  REGISTER_SERVICE_AGREEMENT_FALLBACK,
  REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
} from '@/lib/agent-registration';
import {
  openInspectionRateLabel,
  type AgentBillingPricingCatalog,
} from '@/lib/crossub-api/agent-billing-client';
import {
  isInspectionOnlyLevel,
  REGISTER_SERVICE_LEVEL_DESCRIPTION,
  REGISTER_SERVICE_LEVEL_LABEL,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { api } from '@/lib/api';
import type { SystemAccessAgreementView } from '@/lib/system-access-agreement';
import { cn, formatCurrency } from '@/lib/utils';

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

type PreviewKind = 'service' | 'privacy' | null;

function formatProfileValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export function RegisterConfirmPanel({
  summary,
  portalServiceLevel,
  acceptServiceAgreement,
  acceptPrivacyAgreement,
  onAcceptServiceAgreementChange,
  onAcceptPrivacyAgreementChange,
}: {
  summary: AgentRegistrationSummary;
  portalServiceLevel: AgentPortalServiceLevel;
  acceptServiceAgreement: boolean;
  acceptPrivacyAgreement: boolean;
  onAcceptServiceAgreementChange: (value: boolean) => void;
  onAcceptPrivacyAgreementChange: (value: boolean) => void;
}) {
  const isInspectionOnly = isInspectionOnlyLevel(portalServiceLevel);

  const [catalog, setCatalog] = useState<RegistrationPricingCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [privacyMeta, setPrivacyMeta] = useState<SystemAccessAgreementView | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);

  const privacyDocumentHref = `/api${REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH}`;
  const serviceDocumentHref = `/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`;

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

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<SystemAccessAgreementView>(
          REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
        );
        setPrivacyMeta(data);
      } catch {
        setPrivacyMeta(null);
      }
    })();
  }, []);

  const privacyTitle =
    privacyMeta?.title ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.title;
  const privacyFileName =
    privacyMeta?.fileName ?? REGISTER_SYSTEM_ACCESS_AGREEMENT_FALLBACK.fileName;

  const servicePreview = useMemo<DocumentPreviewItem>(
    () => ({
      title: REGISTER_SERVICE_AGREEMENT_FALLBACK.title,
      fileName: REGISTER_SERVICE_AGREEMENT_FALLBACK.fileName,
      downloadFileName: REGISTER_SERVICE_AGREEMENT_FALLBACK.fileName,
      href: serviceDocumentHref,
    }),
    [serviceDocumentHref],
  );

  const privacyPreview = useMemo<DocumentPreviewItem>(
    () => ({
      title: privacyTitle,
      fileName: privacyFileName,
      downloadFileName: privacyFileName,
      href: privacyDocumentHref,
    }),
    [privacyDocumentHref, privacyFileName, privacyTitle],
  );

  const activePreview = previewKind === 'service' ? servicePreview : privacyPreview;

  const openAgreement = (kind: Exclude<PreviewKind, null>) => {
    setPreviewKind(kind);
  };

  const handleServiceAgreementChange = (checked: boolean) => {
    onAcceptServiceAgreementChange(checked);
  };

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
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {REGISTER_SERVICE_LEVEL_DESCRIPTION[portalServiceLevel]}
        </p>

        {catalogLoading ? (
          <div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading service details…
          </div>
        ) : null}

        {catalog && !isInspectionOnly ? (
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

      <div className="space-y-3">
        <p className="text-sm font-medium">Agreements</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Click an agreement card to preview it in a pop-up, then tick the checkbox to accept.
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => openAgreement('service')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openAgreement('service');
            }
          }}
          className={cn(
            'group cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all',
            'hover:border-primary hover:bg-primary/5 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            acceptServiceAgreement
              ? 'border-primary/50 bg-primary/5'
              : 'border-primary/30 bg-muted/20',
          )}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptServiceAgreement"
              className="mt-1 size-4 shrink-0 cursor-pointer rounded border-border"
              checked={acceptServiceAgreement}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => handleServiceAgreementChange(event.target.checked)}
              aria-describedby="service-agreement-help"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary underline underline-offset-2 group-hover:opacity-90">
                  Service Agreement
                </p>
                <ExternalLink className="size-3.5 shrink-0 text-primary opacity-70 group-hover:opacity-100" />
                <span className="text-muted-foreground text-[11px] font-medium normal-case tracking-normal">
                  Click to preview
                </span>
              </div>
              <p id="service-agreement-help" className="text-muted-foreground text-xs leading-relaxed">
                Checking this box automatically populates the intermediary&apos;s information from
                your registration details and saves it to the agent profile when you create the
                account.
              </p>
              {acceptServiceAgreement ? (
                <div
                  className="rounded-md border border-border/50 bg-background/80 p-3"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Intermediary information (saved to agent profile)
                  </p>
                  <dl className="text-xs">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Intermediary / agent name</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(`${summary.firstName} ${summary.lastName}`)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.email)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Agency</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.agencyName)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Company</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.agencyCompany)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.phone)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Licence</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.licenceNumber)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">ABN</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.abn)}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Office address</dt>
                        <dd className="font-medium text-foreground">
                          {formatProfileValue(summary.officeAddress)}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => openAgreement('privacy')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openAgreement('privacy');
            }
          }}
          className={cn(
            'group cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all',
            'hover:border-primary hover:bg-primary/5 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            acceptPrivacyAgreement
              ? 'border-primary/50 bg-primary/5'
              : 'border-primary/30 bg-muted/20',
          )}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptPrivacyAgreement"
              className="mt-1 size-4 shrink-0 cursor-pointer rounded border-border"
              checked={acceptPrivacyAgreement}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onAcceptPrivacyAgreementChange(event.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary underline underline-offset-2 group-hover:opacity-90">
                  {privacyTitle}
                </p>
                <ExternalLink className="size-3.5 shrink-0 text-primary opacity-70 group-hover:opacity-100" />
                <span className="text-muted-foreground text-[11px] font-medium normal-case tracking-normal">
                  Click to preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocumentPreviewDialog
        doc={previewKind ? activePreview : null}
        subtitle={
          previewKind === 'privacy' ? 'CROSSUB Service Agreement (NSW)' : undefined
        }
        open={previewKind != null}
        onClose={() => setPreviewKind(null)}
      />
    </div>
  );
}

export function registerConfirmReady({
  acceptServiceAgreement,
  acceptPrivacyAgreement,
}: {
  portalServiceLevel?: AgentPortalServiceLevel;
  acceptServiceAgreement: boolean;
  acceptPrivacyAgreement: boolean;
}): boolean {
  return acceptServiceAgreement && acceptPrivacyAgreement;
}
