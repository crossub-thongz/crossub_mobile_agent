'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { PropertyAssignedAgentDialog } from '@/components/agent/property-assigned-agent-dialog';
import {
  PropertyDocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/property-document-preview-dialog';
import { PropertyLandlordOverviewEditDialog } from '@/components/agent/property-landlord-overview-edit-dialog';
import { MANAGEMENT_AGREEMENT_DOC_SLOT } from '@/components/agent/property-management-details-section';
import { PropertyProfileInfoCard } from '@/components/agent/property-profile/property-profile-info-card';
import { PropertyRentSettingsDialog } from '@/components/agent/property-rent-settings-dialog';
import { resolveManagementAgreementDoc } from '@/components/agent/property-tenancy-management-sections';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  AGENCY_CARD_COPY as COPY,
  MANAGEMENT_RATE_GST,
  OVERVIEW_COPY,
  TENANCY_PLACEHOLDER,
} from '@/constants/property-tenancies';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import { agentDocumentPreviewHref, isViewableDocumentUrl } from '@/lib/document-preview';
import { PORTAL_SERVICE_LEVEL_LABEL } from '@/lib/portal-service-level';
import type { AgentDocument, Property } from '@/lib/types';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';

import { CardLink, FieldLabel } from './tenancy-ui';

function Cell({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
      {action ? <CardLink className="mt-0.5" label={action.label} onClick={action.onClick} /> : null}
    </div>
  );
}

/**
 * Agency details on the Self-Manage Overview, below the Property, Tenancy and Owner cards: the
 * admin Agent card, and everything the former Agency Details card let the agent do — edit the
 * owner and management rate (with the management agreement upload), the repair limit and the
 * assigned agent, and preview the management agreement.
 */
export function SelfManagedAgencyCard({
  property,
  record,
  propertyDocs,
  onChanged,
}: {
  property: Property;
  record: PropertyTenancyOverview;
  propertyDocs: AgentDocument[];
  onChanged: () => void;
}) {
  const { agencies } = useAgentData();
  const [landlordOpen, setLandlordOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocumentPreviewItem | null>(null);

  const agency = agencies.find((row) => row.id === property.agencyId);
  const agencyName = (agency?.name ?? property.agencyName) || TENANCY_PLACEHOLDER;
  const serviceType = agency?.portalServiceLevel
    ? PORTAL_SERVICE_LEVEL_LABEL[agency.portalServiceLevel]
    : TENANCY_PLACEHOLDER;
  const rate = record.overview.managementRatePercent ?? property.managementRatePercent;
  const gst = record.overview.managementRateGst ?? property.managementRateGst;
  const gstLabel =
    gst === MANAGEMENT_RATE_GST.INCLUDE
      ? OVERVIEW_COPY.GST_INCLUDE
      : gst === MANAGEMENT_RATE_GST.EXCLUDE
        ? OVERVIEW_COPY.GST_EXCLUDE
        : '';
  const rateLabel = rate != null ? `${rate}%${gstLabel ? ` ${gstLabel}` : ''}` : TENANCY_PLACEHOLDER;
  const repairLimit =
    property.maintenanceSpendThreshold != null
      ? formatCurrency(property.maintenanceSpendThreshold)
      : OVERVIEW_COPY.NOT_RECORDED;

  const agreement = useMemo(
    () =>
      resolveManagementAgreementDoc(
        [],
        propertyDocs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          uploadedAt: doc.uploadedAt,
          category: doc.category,
          href: agentDocumentPreviewHref(doc.id, doc.downloadUrl ?? doc.href),
        })),
      ),
    [propertyDocs],
  );
  const agreementHref = agreement?.href && isViewableDocumentUrl(agreement.href) ? agreement.href : null;

  const landlordInitial = {
    landlordName: property.homeOwnerName === TENANCY_PLACEHOLDER ? '' : property.homeOwnerName,
    landlordEmail: property.homeOwnerContact?.email ?? '',
    landlordPhone: property.homeOwnerContact?.phone ?? '',
    managementRatePercent: rate != null ? String(rate) : '',
    managementRateGst: (gst ?? '') as '' | 'include' | 'exclude',
  };

  return (
    <>
      <PropertyProfileInfoCard title={COPY.TITLE} icon={Building2} onEdit={() => setLandlordOpen(true)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Cell label={COPY.AGENCY} value={agencyName} />
          <Cell label={COPY.SERVICE_TYPE} value={serviceType} />
          <Cell
            label={COPY.MANAGEMENT_RATE}
            value={rateLabel}
            action={{ label: COPY.EDIT, onClick: () => setLandlordOpen(true) }}
          />
          <Cell
            label={COPY.REPAIR_LIMIT}
            value={repairLimit}
            action={{ label: COPY.EDIT, onClick: () => setRepairOpen(true) }}
          />
          <Cell
            label={COPY.ASSIGNED_AGENT}
            value={property.assignedPortalAgentName?.trim() || TENANCY_PLACEHOLDER}
            action={property.agencyId ? { label: COPY.EDIT, onClick: () => setAgentOpen(true) } : undefined}
          />
          <Cell
            label={COPY.MANAGEMENT_AGREEMENT}
            value={agreementHref ? COPY.VIEW_AGREEMENT : COPY.NOT_UPLOADED}
            action={
              agreementHref && agreement
                ? {
                    label: COPY.VIEW_AGREEMENT,
                    onClick: () =>
                      setDocPreview({
                        title: MANAGEMENT_AGREEMENT_DOC_SLOT.label,
                        uploadedAt: agreement.uploadedAt,
                        href: agreementHref,
                      }),
                  }
                : undefined
            }
          />
          {property.endOfManagementDate ? (
            <Cell label={COPY.END_OF_MANAGEMENT} value={formatDate(property.endOfManagementDate)} />
          ) : null}
        </div>
      </PropertyProfileInfoCard>

      <PropertyLandlordOverviewEditDialog
        open={landlordOpen}
        onOpenChange={setLandlordOpen}
        propertyId={property.id}
        property={property}
        initial={landlordInitial}
        onSaved={onChanged}
      />
      <PropertyRentSettingsDialog open={repairOpen} onOpenChange={setRepairOpen} property={property} onSaved={onChanged} />
      <PropertyAssignedAgentDialog open={agentOpen} onOpenChange={setAgentOpen} property={property} onSaved={onChanged} />
      <PropertyDocumentPreviewDialog
        doc={docPreview}
        propertyAddress={formatPropertyFullAddress(property)}
        open={docPreview != null}
        onClose={() => setDocPreview(null)}
      />
    </>
  );
}
