'use client';

import { useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { InfoPanel } from '@/components/agent/info-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildDocumentChecklistByGroup,
  CREATE_PROPERTY_DOCUMENT_GROUP_LABELS,
  CREATE_PROPERTY_DOCUMENT_GROUP_ORDER,
  ensureGroupDocumentTitle,
  EXPECTED_PROPERTY_DOCUMENT_SLOTS,
  type CreatePropertyDocumentGroup,
  type DocumentChecklistRow,
} from '@/lib/property-create-document-groups';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { AgentDocument, Property } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type DisplayDoc = {
  id: string;
  title: string;
  uploadedAt: string;
  href?: string | null;
};

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

function DocumentTable({
  group,
  rows,
  onUploadForType,
  uploadingSlotId,
}: {
  group: CreatePropertyDocumentGroup;
  rows: DocumentChecklistRow[];
  onUploadForType: (title: string, slotId?: string) => void;
  uploadingSlotId: string | null;
}) {
  const uploadedCount = rows.filter((r) => r.uploaded).length;

  return (
    <InfoPanel
      title={`${CREATE_PROPERTY_DOCUMENT_GROUP_LABELS[group]} (${uploadedCount}/${rows.length})`}
      icon={FileText}
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 font-semibold">Document type</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Uploaded when</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const busy = uploadingSlotId != null && uploadingSlotId === (row.slotId ?? row.id);
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2.5 font-medium">{row.title}</td>
                  <td className="px-3 py-2.5">
                    {row.uploaded ? (
                      <span className="text-primary text-xs font-semibold">Uploaded</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not uploaded</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 text-xs tabular-nums">
                    {row.uploaded && row.uploadedAt ? formatDateTime(row.uploadedAt) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.href && row.href !== '#' ? (
                        <a
                          href={row.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs font-semibold"
                        >
                          Open
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy || uploadingSlotId != null}
                        onClick={() => onUploadForType(row.title, row.slotId)}
                        className="text-primary text-xs font-semibold disabled:opacity-50"
                      >
                        {busy ? 'Uploading…' : row.uploaded ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </InfoPanel>
  );
}

export function PropertyDocumentsTab({
  property,
  propertyId,
  fallbackDocuments = [],
}: {
  property: Property;
  propertyId: string;
  fallbackDocuments?: AgentDocument[];
}) {
  const { apiConnected, uploadDocument } = useAgentData();
  const { detail, refresh } = usePropertyPortalDetail(propertyId, apiConnected);
  const portalDocuments = detail?.documents ?? [];

  const [customGroup, setCustomGroup] = useState<CreatePropertyDocumentGroup>('tenancy');
  const [customTitle, setCustomTitle] = useState('');
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ title: string; slotId: string } | null>(null);

  const displayDocs = useMemo<DisplayDoc[]>(() => {
    const byId = new Map<string, DisplayDoc>();

    for (const doc of portalDocuments) {
      byId.set(doc.id, {
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        href: doc.url,
      });
    }

    for (const doc of fallbackDocuments) {
      if (byId.has(doc.id)) continue;
      byId.set(doc.id, {
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        href: doc.downloadUrl ?? doc.href,
      });
    }

    return [...byId.values()];
  }, [portalDocuments, fallbackDocuments]);

  const checklist = useMemo(
    () => buildDocumentChecklistByGroup(displayDocs),
    [displayDocs],
  );

  const slotOptions = useMemo(
    () => EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === customGroup),
    [customGroup],
  );

  const startUpload = (title: string, slotId?: string) => {
    pendingUploadRef.current = {
      title: title.trim(),
      slotId: slotId ?? `custom-${Date.now()}`,
    };
    fileInputRef.current?.click();
  };

  const onUploadForType = (title: string, slotId?: string) => {
    // For expected slots, always upload with the canonical slot label.
    const slot = slotId
      ? EXPECTED_PROPERTY_DOCUMENT_SLOTS.find((s) => s.id === slotId)
      : undefined;
    startUpload(slot?.label ?? title, slotId);
  };

  const onPickCustomFile = () => {
    if (!customTitle.trim()) {
      toast.error('Enter a document title before uploading');
      return;
    }
    const title = ensureGroupDocumentTitle(customGroup, customTitle.trim());
    startUpload(title, `custom-${customGroup}`);
  };

  const onFileSelected = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    const pending = pendingUploadRef.current;
    if (!file || !pending) return;

    setUploadingSlotId(pending.slotId);
    try {
      const propertyAddress = `${property.address}, ${property.suburb}`;
      await uploadDocument(file, 'lease', propertyAddress, {
        title: pending.title,
        propertyId,
      });
      await refresh();
      toast.success(`Uploaded ${file.name}`);
      setCustomTitle('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingSlotId(null);
      pendingUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        All related document types for {property.address}. Uploaded files show the date and time;
        missing types show as not uploaded.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFileSelected(e.target.files)}
      />

      <InfoPanel title="Add other document" icon={Plus}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Group
              </Label>
              <select
                value={customGroup}
                onChange={(e) => {
                  setCustomGroup(e.target.value as CreatePropertyDocumentGroup);
                  setCustomTitle('');
                }}
                className={selectClass}
                disabled={uploadingSlotId != null}
              >
                {CREATE_PROPERTY_DOCUMENT_GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {CREATE_PROPERTY_DOCUMENT_GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Document title
              </Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                list={`doc-titles-${customGroup}`}
                placeholder="Type or pick a document type"
                disabled={uploadingSlotId != null}
              />
              <datalist id={`doc-titles-${customGroup}`}>
                {slotOptions.map((s) => (
                  <option key={s.id} value={s.label} />
                ))}
              </datalist>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className={cn('gap-1.5')}
            disabled={uploadingSlotId != null}
            onClick={onPickCustomFile}
          >
            {uploadingSlotId?.startsWith('custom-') ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploadingSlotId?.startsWith('custom-') ? 'Uploading…' : 'Upload document'}
          </Button>
        </div>
      </InfoPanel>

      {CREATE_PROPERTY_DOCUMENT_GROUP_ORDER.map((g) => (
        <DocumentTable
          key={g}
          group={g}
          rows={checklist[g]}
          onUploadForType={onUploadForType}
          uploadingSlotId={uploadingSlotId}
        />
      ))}
    </div>
  );
}
