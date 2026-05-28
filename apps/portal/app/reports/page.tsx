'use client';

import { useMemo, useState } from 'react';
import { FileText, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentViewer } from '@/components/agent/document-viewer';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AgentDocument } from '@/lib/types';
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
  const { documents, properties, uploadDocument } = useAgentData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [uploadProperty, setUploadProperty] = useState('');

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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const address =
      uploadProperty ||
      properties[0]?.address + ', ' + properties[0]?.suburb ||
      'Portfolio';
    const category =
      filter !== 'all' ? (filter as AgentDocument['category']) : 'maintenance';
    uploadDocument(file, category, address);
    toast.success(`${file.name} uploaded (saved on this device)`);
    e.target.value = '';
  };

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

            <div className="space-y-2 rounded-xl border bg-card p-3">
              <p className="text-sm font-medium">Upload document</p>
              {properties.length > 0 && (
                <select
                  value={uploadProperty}
                  onChange={(e) => setUploadProperty(e.target.value)}
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-xs outline-none dark:bg-input/30"
                >
                  <option value="">Select property (optional)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={`${p.address}, ${p.suburb}`}>
                      {p.address}, {p.suburb}
                    </option>
                  ))}
                </select>
              )}
              <label className="block">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="size-4" />
                    Choose file
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="sr-only"
                  onChange={handleUpload}
                />
              </label>
              <p className="text-muted-foreground text-[10px]">
                Demo upload — file metadata saved locally until crossub_web sync.
              </p>
            </div>

            {list.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents"
                description="Reports from CROSSUB and your uploads will appear here."
              />
            ) : (
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
            )}
          </>
        )}
      </div>
    </AgentShell>
  );
}
