'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import {
  DecisionWithOwnerEmail,
  OwnerDecisionTimeline,
} from '@/components/agent/decision-with-owner-email';
import { ModuleLanePill } from '@/components/agent/module-workspace/module-workspace';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  MODULE_WORKSPACE_LABELS,
  type ModuleLaneDefinition,
} from '@/constants/module-workspace';
import {
  OWNER_DECISION_MODULE_CASE_TYPE,
  OWNER_DECISION_MODULE_OPTIONS,
  type OwnerDecisionModule,
} from '@/constants/owner-decision';
import { isPropertySelfManaged } from '@/lib/portal-service-level';
import { formatPropertyFullAddress } from '@/lib/utils';

export type ModuleCaseDetailField = { label: string; value: ReactNode };

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border/60 border-t px-4 py-4">
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Right-hand pane on the Self-Manage module pages: job summary, a link to the existing full
 * detail page, the module's own actions when it has them (Maintenance, Phase 1), a generic
 * "Record a decision" (left out where the module's actions already make the decision) and the
 * owner decision history for this job.
 */
export function ModuleCaseDetail({
  module,
  caseId,
  propertyId,
  propertyAddress,
  reference,
  title,
  lane,
  statusLabel,
  fields,
  detailHref,
  actions,
  recordDecision = true,
}: {
  module: OwnerDecisionModule;
  /** The job's UUID — decisions are filed against it. */
  caseId: string;
  propertyId: string;
  /** Address on the job row; the property record's full address wins when it is loaded. */
  propertyAddress: string;
  reference: string;
  title: string;
  lane: ModuleLaneDefinition<string>;
  /** The job's own status text when it says more than the lane. */
  statusLabel?: string;
  fields: readonly ModuleCaseDetailField[];
  detailHref: string;
  /** The module's workflow actions for this job, above the generic decision record. */
  actions?: { title: string; content: ReactNode };
  /** Show the generic "Record a decision"; off where `actions` already decide (agency sign-off). */
  recordDecision?: boolean;
}) {
  const { properties, archivedProperties, agencies } = useAgentData();
  const [decisionToken, setDecisionToken] = useState(0);
  const caseType = OWNER_DECISION_MODULE_CASE_TYPE[module];

  const property = useMemo(
    () =>
      properties.find((p) => p.id === propertyId) ??
      archivedProperties.find((p) => p.id === propertyId) ??
      null,
    [archivedProperties, properties, propertyId],
  );
  const agency = property?.agencyId ? agencies.find((a) => a.id === property.agencyId) : undefined;
  const address = property ? formatPropertyFullAddress(property) || propertyAddress : propertyAddress;

  return (
    <div>
      <header className="space-y-2 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-[11px]">{reference}</span>
          <ModuleLanePill lane={lane} />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-snug">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">{address}</p>
          {statusLabel && statusLabel !== lane.label ? (
            <p className="text-muted-foreground mt-1 text-xs">{statusLabel}</p>
          ) : null}
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href={detailHref}>
            <ExternalLink className="size-3.5" />
            {MODULE_WORKSPACE_LABELS.openFullDetail}
          </Link>
        </Button>
      </header>

      <DetailSection title={MODULE_WORKSPACE_LABELS.summary}>
        <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
          {fields.map((field) => (
            <div key={field.label} className="contents">
              <dt className="text-muted-foreground text-xs leading-5">{field.label}</dt>
              <dd className="min-w-0 break-words text-xs leading-5">{field.value}</dd>
            </div>
          ))}
        </dl>
      </DetailSection>

      {actions ? <DetailSection title={actions.title}>{actions.content}</DetailSection> : null}

      {property ? (
        <>
          {recordDecision ? (
            <DetailSection title={MODULE_WORKSPACE_LABELS.recordDecision}>
              <DecisionWithOwnerEmail
                propertyId={property.id}
                propertyAddress={address}
                caseType={caseType}
                caseId={caseId}
                ownerEmail={property.homeOwnerContact.email}
                ownerName={property.homeOwnerName}
                agencyName={agency?.name ?? MODULE_WORKSPACE_LABELS.yourAgency}
                selfManaged={isPropertySelfManaged(agencies, property.agencyId)}
                options={OWNER_DECISION_MODULE_OPTIONS[module]}
                onRecorded={() => setDecisionToken((n) => n + 1)}
              />
            </DetailSection>
          ) : null}

          <DetailSection title={MODULE_WORKSPACE_LABELS.decisions}>
            <OwnerDecisionTimeline
              propertyId={property.id}
              caseType={caseType}
              caseId={caseId}
              refreshToken={decisionToken}
            />
          </DetailSection>
        </>
      ) : (
        <DetailSection title={MODULE_WORKSPACE_LABELS.decisions}>
          <p className="text-muted-foreground text-xs">{MODULE_WORKSPACE_LABELS.noProperty}</p>
        </DetailSection>
      )}
    </div>
  );
}
