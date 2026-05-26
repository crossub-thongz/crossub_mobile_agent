'use client';

import { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';

import { DocumentViewer } from '@/components/agent/document-viewer';
import { FilterChips } from '@/components/agent/filter-chips';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils';

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'rent_review', label: 'Rent review' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'lease', label: 'Lease' },
  { id: 'vacating', label: 'Vacating' },
];

export default function ReportsPage() {
  const { documents } = useAgentData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewDocId, setViewDocId] = useState<string | null>(null);

  const list = useMemo(() => {
    let items = [...documents];
    if (filter !== 'all') items = items.filter((d) => d.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.propertyAddress.toLowerCase().includes(q),
      );
    }
    return items;
  }, [documents, filter, search]);

  const viewing = viewDocId ? list.find((d) => d.id === viewDocId) : null;

  return (
    <AgentShell title="Reports & Documents" backHref="/dashboard">
      <div className="space-y-4">
        {viewing ? (
          <DocumentViewer
            title={viewing.title}
            propertyAddress={viewing.propertyAddress}
            category={viewing.category}
            downloadUrl={viewing.downloadUrl}
            onClose={() => setViewDocId(null)}
          />
        ) : (
          <>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search reports…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterChips options={CATS} value={filter} onChange={setFilter} />
        <div className="space-y-2">
          {list.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setViewDocId(doc.id)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left active:bg-secondary/50"
            >
              <FileText className="text-primary size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {doc.propertyAddress}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {formatDateTime(doc.uploadedAt)} · {doc.category.replace('_', ' ')}
                </p>
              </div>
              <span className="text-primary text-xs">View</span>
            </button>
          ))}
        </div>
          </>
        )}
      </div>
    </AgentShell>
  );
}
