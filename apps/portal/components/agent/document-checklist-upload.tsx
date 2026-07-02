'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { DocumentChecklistItem } from '@/lib/leasing-workflows/constants';
import type { AgentDocument } from '@/lib/types';

export interface ChecklistUploadState {
  [checklistId: string]: { fileName: string; uploadedAt: string }[];
}

interface DocumentChecklistUploadProps {
  checklist: DocumentChecklistItem[];
  uploads: ChecklistUploadState;
  onUpload: (
    file: File,
    checklistId: string,
    category: AgentDocument['category'],
  ) => Promise<void>;
  disabled?: boolean;
}

export function DocumentChecklistUpload({
  checklist,
  uploads,
  onUpload,
  disabled,
}: DocumentChecklistUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const trigger = (id: string) => {
    setActiveId(id);
    inputRef.current?.click();
  };

  const onFile = async (fileList: FileList | null) => {
    if (!fileList?.length || !activeId) return;
    setUploading(true);
    try {
      await onUpload(fileList[0], activeId, 'lease');
      toast.success(`Uploaded ${fileList[0].name}`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setActiveId(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const doneCount = checklist.filter(
    (item) => item.required && (uploads[item.id]?.length ?? 0) > 0,
  ).length;
  const requiredCount = checklist.filter((item) => item.required).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <p className="font-semibold">Document checklist</p>
        <p className="text-muted-foreground tabular-nums">
          {doneCount}/{requiredCount} required
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFile(e.target.files)}
      />
      <ul className="space-y-2">
        {checklist.map((item) => {
          const files = uploads[item.id] ?? [];
          const met = !item.required || files.length > 0;
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {item.label}
                  {item.required && <span className="text-destructive"> *</span>}
                </p>
                {files.length > 0 ? (
                  <p className="text-muted-foreground truncate text-xs">
                    {files.map((f) => f.fileName).join(', ')}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">Not uploaded</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant={met ? 'outline' : 'default'}
                className="h-8 shrink-0 text-xs"
                disabled={disabled || uploading}
                onClick={() => trigger(item.id)}
              >
                {uploading && activeId === item.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : files.length ? (
                  <FileUp className="size-3.5" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                <span className="ml-1">{files.length ? 'Add' : 'Upload'}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
