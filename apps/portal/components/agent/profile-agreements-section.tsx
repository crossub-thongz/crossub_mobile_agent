'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, FileSignature, Loader2 } from 'lucide-react';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import { StatusBadge } from '@/components/agent/status-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  fetchSalesAgreements,
  type AgentSalesAgreement,
} from '@/lib/crossub-api/agent-client';
import { formatDateTime } from '@/lib/utils';

function statusLabel(
  status: AgentSalesAgreement['status'],
  selfRegistration: boolean,
): string {
  switch (status) {
    case 'sent':
      return 'Awaiting signature';
    case 'returned':
      return selfRegistration ? 'Uploaded' : 'Awaiting sales approval';
    case 'signed':
      return 'Signed';
    case 'declined':
      return 'Rejected';
    default:
      return status.replace(/_/g, ' ');
  }
}

function statusVariant(status: AgentSalesAgreement['status']): 'default' | 'success' | 'approval' {
  if (status === 'sent') return 'approval';
  if (status === 'returned' || status === 'signed') return 'success';
  return 'default';
}

function signedCopyPreviewDoc(agreement: AgentSalesAgreement): DocumentPreviewItem {
  return {
    title: 'CROSSUB Service Agreement — signed copy',
    fileName: agreement.returnedDocumentName ?? 'signed-service-agreement.pdf',
    downloadFileName: agreement.returnedDocumentName ?? 'signed-service-agreement.pdf',
    href: agreement.returnedDocumentUrl!,
    uploadedAt: agreement.agentReturnedAt ?? undefined,
  };
}

export function ProfileAgreementsSection() {
  const { hasFullManagementAccess } = useAgentData();
  const [agreements, setAgreements] = useState<AgentSalesAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DocumentPreviewItem | null>(null);
  const [previewSubtitle, setPreviewSubtitle] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchSalesAgreements();
      setAgreements(rows);
    } catch {
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFullManagementAccess) {
      setLoading(false);
      return;
    }
    void load();
  }, [hasFullManagementAccess, load]);

  if (!hasFullManagementAccess) return null;

  if (loading) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading agreements…
        </div>
      </section>
    );
  }

  if (agreements.length === 0) return null;

  const signedOrUploaded = agreements.filter(
    (row) => row.returnedDocumentUrl || row.status === 'signed' || row.status === 'returned',
  );

  return (
    <>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Service agreement</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Your signed CROSSUB Service Agreement (NSW) — kept on file for your agency.
            </p>
          </div>
          <Link
            href={ROUTES.AGREEMENTS}
            className="text-primary shrink-0 text-xs font-medium"
          >
            All agreements
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          {agreements.map((agreement) => (
            <div
              key={agreement.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-background/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileSignature className="text-muted-foreground size-4 shrink-0" />
                  <p className="text-sm font-medium">{agreement.title}</p>
                  <StatusBadge
                    label={statusLabel(agreement.status, agreement.selfRegistration)}
                    variant={statusVariant(agreement.status)}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{agreement.agencyName}</p>
                {agreement.agentReturnedAt ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Uploaded {formatDateTime(agreement.agentReturnedAt)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {agreement.returnedDocumentUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewDoc(signedCopyPreviewDoc(agreement));
                      setPreviewSubtitle(agreement.agencyName);
                    }}
                  >
                    <Eye className="mr-1.5 size-3.5" />
                    View signed copy
                  </Button>
                ) : agreement.status === 'sent' ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={ROUTES.AGREEMENTS}>Upload signed copy</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {signedOrUploaded.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Once you upload your signed service agreement, it will appear here for easy access.
          </p>
        ) : null}
      </section>

      <DocumentPreviewDialog
        doc={previewDoc}
        subtitle={previewSubtitle}
        open={previewDoc != null}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewSubtitle(undefined);
        }}
      />
    </>
  );
}
