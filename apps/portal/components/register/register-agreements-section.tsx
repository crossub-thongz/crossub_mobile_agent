'use client';

import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import {
  fetchRegisterServiceAgreementPreview,
  REGISTER_SERVICE_AGREEMENT_FALLBACK,
  REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH,
  REGISTER_SYSTEM_ACCESS_AGREEMENT_PATH,
  REGISTER_TERMS_AND_CONDITIONS_TITLE,
  registerTermsDocumentFileName,
  type RegisterServiceAgreementPreviewInput,
} from '@/lib/agent-registration';
import { api } from '@/lib/api';
import type { SystemAccessAgreementView } from '@/lib/system-access-agreement';
import { cn } from '@/lib/utils';

type PreviewKind = 'service' | 'privacy' | null;

function formatProfileValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export function registerAgreementsReady(
  acceptServiceAgreement: boolean,
  acceptPrivacyAgreement: boolean,
): boolean {
  return acceptServiceAgreement && acceptPrivacyAgreement;
}

export function RegisterAgreementsSection({
  summary,
  acceptServiceAgreement,
  acceptPrivacyAgreement,
  onAcceptServiceAgreementChange,
  onAcceptPrivacyAgreementChange,
  serviceAgreementHelpText = "Checking this box automatically populates the intermediary's information from your registration details and saves it to the agent profile when you create the account.",
  showIntermediarySummary = true,
}: {
  summary: RegisterServiceAgreementPreviewInput;
  acceptServiceAgreement: boolean;
  acceptPrivacyAgreement: boolean;
  onAcceptServiceAgreementChange: (value: boolean) => void;
  onAcceptPrivacyAgreementChange: (value: boolean) => void;
  serviceAgreementHelpText?: string;
  showIntermediarySummary?: boolean;
}) {
  const [privacyMeta, setPrivacyMeta] = useState<SystemAccessAgreementView | null>(null);
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null);
  const [servicePreviewLoading, setServicePreviewLoading] = useState(false);
  const serviceBlobUrlRef = useRef<string | null>(null);
  const [servicePreviewHref, setServicePreviewHref] = useState(
    () => `/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`,
  );

  const privacyDocumentHref = `/api${REGISTER_SYSTEM_ACCESS_AGREEMENT_DOCUMENT_PATH}`;

  const revokeServiceBlob = useCallback(() => {
    if (serviceBlobUrlRef.current) {
      URL.revokeObjectURL(serviceBlobUrlRef.current);
      serviceBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokeServiceBlob(), [revokeServiceBlob]);

  useEffect(() => {
    revokeServiceBlob();
    setServicePreviewHref(`/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`);
  }, [summary, revokeServiceBlob]);

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

  const privacyFileName = registerTermsDocumentFileName(privacyMeta);

  const servicePreview = useMemo<DocumentPreviewItem>(
    () => ({
      title: REGISTER_SERVICE_AGREEMENT_FALLBACK.title,
      fileName: REGISTER_SERVICE_AGREEMENT_FALLBACK.fileName,
      downloadFileName: REGISTER_SERVICE_AGREEMENT_FALLBACK.fileName,
      href: servicePreviewHref,
    }),
    [servicePreviewHref],
  );

  const privacyPreview = useMemo<DocumentPreviewItem>(
    () => ({
      title: REGISTER_TERMS_AND_CONDITIONS_TITLE,
      fileName: privacyFileName,
      downloadFileName: privacyFileName,
      href: privacyDocumentHref,
    }),
    [privacyDocumentHref, privacyFileName],
  );

  const activePreview = previewKind === 'service' ? servicePreview : privacyPreview;

  const openAgreement = (kind: Exclude<PreviewKind, null>) => {
    if (kind === 'service') {
      setServicePreviewLoading(true);
      void (async () => {
        try {
          const blob = await fetchRegisterServiceAgreementPreview(summary);
          revokeServiceBlob();
          const url = URL.createObjectURL(blob);
          serviceBlobUrlRef.current = url;
          setServicePreviewHref(url);
          setPreviewKind('service');
        } catch {
          revokeServiceBlob();
          setServicePreviewHref(`/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`);
          setPreviewKind('service');
        } finally {
          setServicePreviewLoading(false);
        }
      })();
      return;
    }
    setPreviewKind(kind);
  };

  return (
    <>
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
              onChange={(event) => onAcceptServiceAgreementChange(event.target.checked)}
              aria-describedby="service-agreement-help"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary underline underline-offset-2 group-hover:opacity-90">
                  Service Agreement
                </p>
                <ExternalLink className="size-3.5 shrink-0 text-primary opacity-70 group-hover:opacity-100" />
                <span className="text-muted-foreground text-[11px] font-medium normal-case tracking-normal">
                  {servicePreviewLoading ? 'Preparing preview…' : 'Click to preview'}
                </span>
              </div>
              <p id="service-agreement-help" className="text-muted-foreground text-xs leading-relaxed">
                {serviceAgreementHelpText}
              </p>
              {showIntermediarySummary && acceptServiceAgreement ? (
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
                  {REGISTER_TERMS_AND_CONDITIONS_TITLE}
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
          previewKind === 'privacy' ? REGISTER_TERMS_AND_CONDITIONS_TITLE : undefined
        }
        open={previewKind != null}
        onClose={() => setPreviewKind(null)}
      />
    </>
  );
}
