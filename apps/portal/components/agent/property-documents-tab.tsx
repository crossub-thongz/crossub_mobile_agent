'use client';

import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import Link from 'next/link';

import { DocumentViewer } from '@/components/agent/document-viewer';
import { FilterChips } from '@/components/agent/filter-chips';
import { InfoPanel } from '@/components/agent/info-panel';
import type { AgentDocument } from '@/lib/types';
import {
  CATEGORY_ORDER,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_GROUP_LABELS,
  DOCUMENT_GROUP_ORDER,
  documentGroup,
  groupPropertyDocuments,
} from '@/lib/property-document-categories';
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

function DocumentRow({
  doc,
  onView,
}: {
  doc: AgentDocument;
  onView: (doc: AgentDocument) => void;
}) {
  const downloadUrl = doc.downloadUrl ?? doc.href;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 px-3 py-3">
      <FileText className="text-primary size-4 shrink-0" />
      <button
        type="button"
        onClick={() => onView(doc)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="text-muted-foreground text-[11px]">
          {formatDateTime(doc.uploadedAt)} · {DOCUMENT_CATEGORY_LABELS[doc.category]}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onView(doc)}
          className="text-primary text-xs font-semibold"
        >
          View
        </button>
        {downloadUrl && downloadUrl !== '#' ? (
          <a
            href={downloadUrl}
            download={doc.title}
            className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Download className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PropertyDocumentsTab({ documents }: { documents: AgentDocument[] }) {
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [viewing, setViewing] = useState<AgentDocument | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return documents;
    if (filter === 'reports' || filter === 'documents') {
      return documents.filter((d) => documentGroup(d.category) === filter);
    }
    return documents.filter((d) => d.category === filter);
  }, [documents, filter]);

  const grouped = useMemo(() => groupPropertyDocuments(filtered), [filtered]);

  if (viewing) {
    return (
      <DocumentViewer
        title={viewing.title}
        propertyAddress={viewing.propertyAddress}
        category={viewing.category}
        downloadUrl={viewing.downloadUrl ?? viewing.href}
        onClose={() => setViewing(null)}
      />
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
            or complete a Transfer IN checklist on this property.
          </p>
        </InfoPanel>
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
                          <DocumentRow key={doc.id} doc={doc} onView={setViewing} />
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
