'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  DocumentChecklistUpload,
  type ChecklistUploadState,
} from '@/components/agent/document-checklist-upload';
import { PropertyImportPanel } from '@/components/agent/property-import-panel';
import { WorkflowStageRail } from '@/components/agent/workflow-stage-rail';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyNew, ROUTES } from '@/constants/routes';
import {
  PROPERTY_TRANSFER_IN_STAGES,
  PROPERTY_TRANSFER_OUT_STAGES,
  TRANSFER_IN_DOCUMENT_CHECKLIST,
  TRANSFER_OUT_DOCUMENT_CHECKLIST,
} from '@/lib/leasing-workflows/constants';
import type { PropertyImportResult } from '@/lib/property-import';
import { fileToBase64 } from '@/lib/file-upload';
import { uploadDocument as apiUploadDocument } from '@/lib/crossub-api/agent-client';
import type { AgentDocument } from '@/lib/types';
import type { Property } from '@/lib/types';

type TransferTab = 'in' | 'out';

export default function PropertyTransferPage() {
  const { uploadDocument, apiConnected, properties } = useAgentData();
  const [tab, setTab] = useState<TransferTab>('in');
  const [stageIndex, setStageIndex] = useState(0);
  const [uploads, setUploads] = useState<ChecklistUploadState>({});
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const stages = tab === 'in' ? PROPERTY_TRANSFER_IN_STAGES : PROPERTY_TRANSFER_OUT_STAGES;
  const checklist =
    tab === 'in' ? TRANSFER_IN_DOCUMENT_CHECKLIST : TRANSFER_OUT_DOCUMENT_CHECKLIST;

  const stageItems = stages.map((stage, index) => ({
    ...stage,
    status:
      index < stageIndex
        ? ('done' as const)
        : index === stageIndex
          ? ('current' as const)
          : ('upcoming' as const),
  }));

  const handleChecklistUpload = async (
    file: File,
    checklistId: string,
    category: AgentDocument['category'],
  ) => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    const address = prop ? `${prop.address}, ${prop.suburb}` : 'Portfolio';
    uploadDocument(file, category, address);
    setUploads((prev) => ({
      ...prev,
      [checklistId]: [
        ...(prev[checklistId] ?? []),
        { fileName: file.name, uploadedAt: new Date().toISOString() },
      ],
    }));
    if (apiConnected && prop) {
      const contentBase64 = await fileToBase64(file);
      await apiUploadDocument({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        contentBase64,
        category,
        propertyId: prop.id,
      });
    }
  };

  const onImport = async (result: PropertyImportResult, files: File[]) => {
    const matched: ChecklistUploadState = {};
    for (const [id, names] of Object.entries(result.matchedDocuments)) {
      matched[id] = names.map((fileName) => ({
        fileName,
        uploadedAt: new Date().toISOString(),
      }));
    }
    setUploads((prev) => ({ ...prev, ...matched }));
    if (tab === 'in') setStageIndex(2);
    toast.success('Import applied — review checklist and complete setup');

    if (apiConnected && selectedPropertyId) {
      for (const file of files.slice(0, 10)) {
        try {
          const contentBase64 = await fileToBase64(file);
          await apiUploadDocument({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            contentBase64,
            category: 'lease',
            propertyId: selectedPropertyId,
          });
        } catch {
          // individual file failures are non-fatal
        }
      }
    }
  };

  const advance = () => {
    if (stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1);
      toast.success(`Moved to: ${stages[stageIndex + 1].label}`);
    } else {
      toast.success('Transfer workflow complete');
    }
  };

  return (
    <AgentShell title="Property transfer" backHref={ROUTES.LEASING} backLabel="Leasing">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Transfer IN receives management from another agent; Transfer OUT hands over to a new
          agent. Documents sync to crossub_web and appear in Tenant / Inspector apps when linked
          to a live property.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tab === 'in' ? 'default' : 'outline'}
            onClick={() => {
              setTab('in');
              setStageIndex(0);
            }}
          >
            Transfer IN
          </Button>
          <Button
            type="button"
            variant={tab === 'out' ? 'default' : 'outline'}
            onClick={() => {
              setTab('out');
              setStageIndex(0);
            }}
          >
            Transfer OUT
          </Button>
        </div>

        <WorkflowStageRail stages={stageItems} title={tab === 'in' ? 'Receiving property' : 'Handing over'} />

        {tab === 'in' && stageIndex === 0 && (
          <Button asChild className="w-full">
            <a href={propertyNew()}>Quick add property</a>
          </Button>
        )}

        <div className="space-y-2 rounded-xl border bg-card p-4">
          <Label htmlFor="property">Linked property</Label>
          <select
            id="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30"
          >
            <option value="">Select property…</option>
            {properties.map((p: Property) => (
              <option key={p.id} value={p.id}>
                {p.address}, {p.suburb}
              </option>
            ))}
          </select>
        </div>

        {(stageIndex === 1 || stageIndex === 2) && tab === 'in' && (
          <PropertyImportPanel onImport={onImport} />
        )}

        {(stageIndex >= 2 || tab === 'out') && (
          <DocumentChecklistUpload
            checklist={checklist}
            uploads={uploads}
            onUpload={handleChecklistUpload}
            disabled={!selectedPropertyId}
          />
        )}

        {stageIndex === 3 && tab === 'in' && (
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">Tenant notification</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Greeting letter with agent contact, trust account, and Tenant App login is sent via
              crossub_web leasing email templates (CC: leasing.nsw@, agent, accounting).
            </p>
          </div>
        )}

        {stageIndex === 4 && tab === 'in' && (
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Rent redirection</p>
            <p className="text-muted-foreground text-xs">
              Monitor next rent due — 24h reminders escalate after 7 days (Accounting module).
            </p>
            <div className="space-y-2">
              <Label htmlFor="rentDue">Next rent due</Label>
              <Input id="rentDue" type="date" />
            </div>
          </div>
        )}

        <Button type="button" className="w-full" onClick={advance}>
          {stageIndex < stages.length - 1 ? `Complete: ${stages[stageIndex].label}` : 'Mark transfer complete'}
        </Button>
      </div>
    </AgentShell>
  );
}
