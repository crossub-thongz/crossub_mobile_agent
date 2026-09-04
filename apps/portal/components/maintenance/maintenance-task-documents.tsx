'use client';

import { useMemo, useState } from 'react';

import { MaintenanceAttachmentPreviewDialog } from '@/components/maintenance/maintenance-attachment-preview-dialog';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  buildMaintenanceDocumentGroups,
} from '@/lib/maintenance-task-detail';

export function MaintenanceTaskDocuments({
  requestId,
  attachments = [],
}: {
  requestId: string;
  attachments?: ApiMaintenanceAttachment[];
}) {
  const groups = useMemo(
    () => buildMaintenanceDocumentGroups(attachments, requestId),
    [attachments, requestId],
  );
  const gallery = useMemo(
    () => groups.flatMap((group) => group.people.flatMap((person) => person.documents.map((doc) => doc.attachment))),
    [groups],
  );
  const [preview, setPreview] = useState<ApiMaintenanceAttachment | null>(null);

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No documents uploaded yet. Completion evidence and invoices appear here once they are
        attached to this job.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      {groups.map((group) => (
        <div key={group.tab} className="space-y-3">
          <h3 className="text-sm font-semibold">{group.tab}</h3>
          {group.people.map((person) => (
            <div key={`${group.tab}:${person.id}`} className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">From {person.from}</p>
              {person.documents.map((doc) => (
                <article key={doc.id} className="rounded-2xl border v2-frosted-surface p-4">
                  <p className="text-sm font-semibold">{doc.fileName}</p>
                  <button
                    type="button"
                    onClick={() => setPreview(doc.attachment)}
                    className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                  >
                    View document
                  </button>
                </article>
              ))}
            </div>
          ))}
        </div>
      ))}
      <MaintenanceAttachmentPreviewDialog
        attachment={preview}
        attachments={gallery}
        onClose={() => setPreview(null)}
      />
    </section>
  );
}
