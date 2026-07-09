'use client';

import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import Link from 'next/link';

import { FilterChips } from '@/components/agent/filter-chips';
import { InfoPanel } from '@/components/agent/info-panel';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  CATEGORY_ORDER,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_GROUP_LABELS,
  DOCUMENT_GROUP_ORDER,
  documentGroup,
  groupPropertyDocuments,
} from '@/lib/property-document-categories';
import {
  groupPortalDocuments,
  inspectionReportDisplayName,
  inspectionReportDownloadType,
  PORTAL_DOCUMENT_GROUP_ORDER,
  reportIdLabel,
} from '@/lib/property-portal-documents';
import type { PropertyPortalDocument } from '@/lib/property-registry-api';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { AgentDocument, Inspection, Property } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'reports', label: 'Reports' },
  { id: 'documents', label: 'Documents' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'rent_review', label: 'Rent review' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'lease', label: 'Lease' },
  { id: 'vacating', label: 'Vacating' },
] as const;

type DocumentFilter = (typeof FILTER_OPTIONS)[number]['id'];

function LegacyDocumentsView({ documents }: { documents: AgentDocument[] }) {
  const [filter, setFilter] = useState<DocumentFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return documents;
    if (filter === 'reports' || filter === 'documents') {
      return documents.filter((d) => documentGroup(d.category) === filter);
    }
    return documents.filter((d) => d.category === filter);
  }, [documents, filter]);

  const grouped = useMemo(() => groupPropertyDocuments(filtered), [filtered]);

  if (documents.length === 0) {
    return (
      <InfoPanel title="Document repository" icon={FileText}>
        <p className="text-muted-foreground text-sm">
          Lease agreements, inspection reports, bond records, and tribunal documents will
          appear here — grouped under Documents and Reports.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Upload files from{' '}
          <Link href="/reports" className="text-primary font-medium underline">
            Reports &amp; Documents
          </Link>{' '}
          or use Transfer OUT to export the full property package.
        </p>
      </InfoPanel>
    );
  }

  return (
    <div className="space-y-4">
      <FilterChips
        options={[...FILTER_OPTIONS]}
        value={filter}
        onChange={(id) => setFilter(id as DocumentFilter)}
      />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents match this filter.</p>
      ) : (
        DOCUMENT_GROUP_ORDER.map((group) => {
          const categories = CATEGORY_ORDER.filter(
            (category) => (grouped[group][category]?.length ?? 0) > 0,
          );
          if (categories.length === 0) return null;

          const groupCount = categories.reduce(
            (sum, category) => sum + (grouped[group][category]?.length ?? 0),
            0,
          );

          return (
            <InfoPanel
              key={group}
              title={`${DOCUMENT_GROUP_LABELS[group]} (${groupCount})`}
              icon={FileText}
            >
              <div className="space-y-4">
                {categories.map((category) => {
                  const items = grouped[group][category] ?? [];
                  return (
                    <section key={category} className="space-y-2">
                      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                        {DOCUMENT_CATEGORY_LABELS[category]}
                      </p>
                      <div className="space-y-2">
                        {items.map((doc) => (
                          <LegacyDocumentRow key={doc.id} doc={doc} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </InfoPanel>
          );
        })
      )}
    </div>
  );
}

function LegacyDocumentRow({ doc }: { doc: AgentDocument }) {
  const downloadUrl = doc.downloadUrl ?? doc.href;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-3">
      <FileText className="text-primary size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="text-muted-foreground text-[11px]">
          {formatDateTime(doc.uploadedAt)} · {DOCUMENT_CATEGORY_LABELS[doc.category]}
        </p>
      </div>
      {downloadUrl && downloadUrl !== '#' ? (
        <a
          href={downloadUrl}
          download={doc.title}
          className="text-primary shrink-0 text-xs font-semibold"
        >
          Download
        </a>
      ) : null}
    </div>
  );
}

function PortalDocumentsView({
  property,
  inspections,
  documents,
}: {
  property: Property;
  inspections: Inspection[];
  documents: PropertyPortalDocument[];
}) {
  const grouped = useMemo(() => groupPortalDocuments(documents), [documents]);
  const inspectionReports = documents.filter((doc) => doc.category === 'inspection_report');

  if (documents.length === 0) {
    return <p className="text-muted-foreground text-sm">No documents on file yet.</p>;
  }

  return (
    <div className="space-y-6">
      {inspectionReports.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Inspection reports</h3>
          <ul className="space-y-1">
            {inspectionReports.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-md border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <dl className="min-w-0 space-y-1 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                      Report name
                    </dt>
                    <dd className="font-medium">
                      {inspectionReportDisplayName(property, inspections, doc)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                      Report ID
                    </dt>
                    <dd className="font-mono text-xs">{reportIdLabel(doc)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                      Uploaded
                    </dt>
                    <dd className="text-muted-foreground text-xs tabular-nums">
                      {doc.uploadedAt.slice(0, 10)}
                    </dd>
                  </div>
                </dl>
                {doc.inspectionId ? (
                  <InspectionReportDownloadActions
                    variant="inline"
                    inspectionId={doc.inspectionId}
                    reportUrl={doc.url}
                    propertyLabel={property.address}
                    inspectionType={inspectionReportDownloadType(inspections, doc)}
                  />
                ) : doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium"
                  >
                    Open PDF
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {PORTAL_DOCUMENT_GROUP_ORDER.map((group) => {
        const docs = grouped[group];
        if (!docs?.length) return null;

        return (
          <section key={group} className="space-y-2">
            <h3 className="text-sm font-semibold">{group}</h3>
            <ul className="space-y-1">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium"
                    >
                      {doc.title}
                    </a>
                  ) : (
                    <span className="font-medium">{doc.title}</span>
                  )}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {doc.uploadedAt.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {grouped.Other?.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Other</h3>
          <ul className="space-y-1">
            {grouped.Other.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium"
                  >
                    {doc.title}
                  </a>
                ) : (
                  <span className="font-medium">{doc.title}</span>
                )}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {doc.uploadedAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function PropertyDocumentsTab({
  property,
  propertyId,
  inspections,
  fallbackDocuments = [],
}: {
  property: Property;
  propertyId: string;
  inspections: Inspection[];
  fallbackDocuments?: AgentDocument[];
}) {
  const { apiConnected } = useAgentData();
  const { detail } = usePropertyPortalDetail(propertyId, apiConnected);
  const portalDocuments = detail?.documents ?? [];
  const usePortalLayout = apiConnected && portalDocuments.length > 0;

  return (
    <div className="space-y-4">
      {usePortalLayout ? (
        <>
          <p className="text-muted-foreground text-sm">
            Inspection reports (ingoing, outgoing, routine, open) and other property documents.
          </p>
          <PortalDocumentsView
            property={property}
            inspections={inspections}
            documents={portalDocuments}
          />
        </>
      ) : (
        <LegacyDocumentsView documents={fallbackDocuments} />
      )}
    </div>
  );
}
