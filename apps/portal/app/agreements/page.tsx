'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FileSignature, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH } from '@/lib/agent-registration';
import { fileToBase64WithProgress } from '@/lib/file-upload';
import {
  fetchSalesAgreementAccessStatus,
  fetchSalesAgreements,
  returnSalesAgreement,
  type AgentSalesAgreement,
  type AgentSalesAgreementAccessStatus,
} from '@/lib/crossub-api/agent-client';
import { formatDateTime } from '@/lib/utils';

const SALES_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Awaiting signature' },
  { id: 'returned', label: 'Returned' },
  { id: 'signed', label: 'Signed' },
  { id: 'declined', label: 'Rejected' },
] as const;

const SELF_REG_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Awaiting signature' },
  { id: 'returned', label: 'Uploaded' },
  { id: 'signed', label: 'Signed' },
  { id: 'declined', label: 'Rejected' },
] as const;

function statusLabel(
  status: AgentSalesAgreement['status'],
  selfRegistration: boolean,
): string {
  switch (status) {
    case 'sent':
      return 'Awaiting signature';
    case 'returned':
      return selfRegistration ? 'Uploaded' : 'Returned to sales';
    case 'signed':
      return 'Signed';
    case 'declined':
      return selfRegistration ? 'Rejected' : 'Rejected by sales';
    default:
      return status.replace(/_/g, ' ');
  }
}

function statusVariant(status: AgentSalesAgreement['status']): 'default' | 'success' | 'approval' {
  if (status === 'sent') return 'approval';
  if (status === 'returned' || status === 'signed') return 'success';
  if (status === 'declined') return 'default';
  return 'default';
}

function agreementPreviewDoc(
  agreement: AgentSalesAgreement,
  templateHref: string,
): DocumentPreviewItem {
  return {
    title: agreement.title,
    fileName: 'CROSSUB Service Agreement NSW.pdf',
    downloadFileName: 'CROSSUB Service Agreement NSW.pdf',
    href: agreement.documentUrl ?? templateHref,
  };
}

export default function AgreementsPage() {
  const [filter, setFilter] = useState('all');
  const [agreements, setAgreements] = useState<AgentSalesAgreement[]>([]);
  const [access, setAccess] = useState<AgentSalesAgreementAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<AgentSalesAgreement | null>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentPreviewItem | null>(null);
  const [previewSubtitle, setPreviewSubtitle] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateHref = `/api${REGISTER_SERVICE_AGREEMENT_TEMPLATE_PATH}`;
  const selfRegistration = access?.selfRegistration ?? agreements.some((row) => row.selfRegistration);
  const filters = selfRegistration ? SELF_REG_FILTERS : SALES_FILTERS;

  const openAgreementPreview = (agreement: AgentSalesAgreement) => {
    setPreviewDoc(agreementPreviewDoc(agreement, templateHref));
    setPreviewSubtitle(agreement.agencyName);
  };

  const openTemplatePreview = () => {
    setPreviewDoc({
      title: 'CROSSUB Service Agreement (NSW)',
      fileName: 'CROSSUB Service Agreement NSW.pdf',
      downloadFileName: 'CROSSUB Service Agreement NSW.pdf',
      href: templateHref,
    });
    setPreviewSubtitle('Default template');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, accessStatus] = await Promise.all([
        fetchSalesAgreements(),
        fetchSalesAgreementAccessStatus(),
      ]);
      setAgreements(rows);
      setAccess(accessStatus);
    } catch {
      setAgreements([]);
      setAccess(null);
      setError('Could not load agreements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return agreements.filter((row) => {
      if (filter === 'pending') return row.status === 'sent';
      if (filter === 'returned') return row.status === 'returned';
      if (filter === 'signed') return row.status === 'signed';
      if (filter === 'declined') return row.status === 'declined';
      return true;
    });
  }, [agreements, filter]);

  const openReturn = (agreement: AgentSalesAgreement) => {
    setReturnTarget(agreement);
    setNotes('');
    setFile(null);
  };

  const closeReturn = () => {
    if (submitting) return;
    setReturnTarget(null);
    setNotes('');
    setFile(null);
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    if (selfRegistration && !file) {
      toast.error('Choose your signed service agreement PDF to upload.');
      return;
    }
    setSubmitting(true);
    try {
      let payload: Parameters<typeof returnSalesAgreement>[1] = {};
      if (notes.trim()) payload.notes = notes.trim();
      if (file) {
        const encoded = await fileToBase64WithProgress(file);
        payload = {
          ...payload,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size,
          contentBase64: encoded,
        };
      }
      const updated = await returnSalesAgreement(returnTarget.id, payload);
      setAgreements((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      const accessStatus = await fetchSalesAgreementAccessStatus();
      setAccess(accessStatus);
      toast.success(
        selfRegistration
          ? 'Signed service agreement uploaded'
          : 'Agreement returned to your salesperson',
      );
      closeReturn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Agreements">
      <div className="space-y-4">
        {access?.blocked ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
            {selfRegistration ? (
              access.pendingCount > 0 ? (
                <p>
                  Preview the CROSSUB Service Agreement template, sign offline, then upload the signed
                  PDF below. You can use the Agent App once your signed copy is uploaded — CROSSUB
                  staff will review it in the admin portal.
                </p>
              ) : (
                <p>
                  Preview your CROSSUB Service Agreement, sign offline, and upload the signed copy
                  to continue.
                </p>
              )
            ) : access.awaitingSalesApproval ? (
              <p>
                Your signed agreement has been returned to your salesperson. The Agent App will
                unlock once they review and approve it.
              </p>
            ) : access.pendingCount > 0 ? (
              <p>
                Preview the CROSSUB Service Agreement template, sign offline, then return the signed
                PDF below. Full Service access unlocks once your signed copy is approved.
              </p>
            ) : (
              <p>
                Preview your CROSSUB Service Agreement, sign offline, and return the signed copy to
                unlock Full Service access.
              </p>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground min-w-[12rem] flex-1">
            {selfRegistration
              ? 'Your CROSSUB Service Agreement (NSW). Preview the template, sign offline, then upload the signed copy to your profile.'
              : 'Your CROSSUB Service Agreement (NSW). Preview the document, sign offline if needed, then upload and return the signed copy.'}
          </p>
          <Button variant="outline" size="sm" onClick={openTemplatePreview}>
            <Eye className="mr-1.5 size-3.5" />
            Preview template
          </Button>
        </div>

        <FilterChips options={filters} value={filter} onChange={setFilter} />

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading agreements…
          </div>
        ) : error ? (
          <EmptyState title="Could not load agreements" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No agreements"
            description={
              filter === 'all'
                ? 'Your service agreement appears here after registration. It is also attached to your registration invite email.'
                : 'Nothing matches this filter.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((agreement) => (
              <article
                key={agreement.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSignature className="size-4 shrink-0 text-muted-foreground" />
                      <h2 className="font-semibold leading-tight">{agreement.title}</h2>
                      <StatusBadge
                        label={statusLabel(agreement.status, agreement.selfRegistration)}
                        variant={statusVariant(agreement.status)}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{agreement.agencyName}</p>
                    {!agreement.selfRegistration ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sales contact: {agreement.assignedSalesperson}
                        {agreement.sentAt ? ` · Sent ${formatDateTime(agreement.sentAt)}` : null}
                      </p>
                    ) : agreement.sentAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sent {formatDateTime(agreement.sentAt)}
                      </p>
                    ) : null}
                    {agreement.agentReturnedAt ? (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                        {agreement.selfRegistration ? 'Uploaded' : 'Returned'}{' '}
                        {formatDateTime(agreement.agentReturnedAt)}
                      </p>
                    ) : null}
                    {agreement.status === 'returned' && !agreement.selfRegistration ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                        Waiting for {agreement.assignedSalesperson || 'your salesperson'} to approve
                        this agreement.
                      </p>
                    ) : null}
                    {agreement.status === 'returned' && agreement.selfRegistration ? (
                      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                        Your signed copy is on file. CROSSUB staff may review it in the admin portal.
                      </p>
                    ) : null}
                    {agreement.status === 'declined' ? (
                      <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
                        {agreement.salesRejectionReason
                          ? `Rejected: ${agreement.salesRejectionReason}`
                          : 'Your salesperson rejected this signed copy. A new agreement will be sent for you to sign.'}
                        {agreement.salesRejectedAt
                          ? ` · ${formatDateTime(agreement.salesRejectedAt)}`
                          : null}
                      </p>
                    ) : null}
                    {agreement.agentReturnNotes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{agreement.agentReturnNotes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAgreementPreview(agreement)}
                    >
                      <Eye className="mr-1.5 size-3.5" />
                      Preview
                    </Button>
                    {agreement.returnedDocumentUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewDoc({
                            title: `${agreement.title} — signed copy`,
                            fileName: agreement.returnedDocumentName ?? 'signed-agreement.pdf',
                            href: agreement.returnedDocumentUrl!,
                          });
                          setPreviewSubtitle(agreement.agencyName);
                        }}
                      >
                        <Eye className="mr-1.5 size-3.5" />
                        Preview signed copy
                      </Button>
                    ) : null}
                    {agreement.status === 'sent' ? (
                      <Button size="sm" onClick={() => openReturn(agreement)}>
                        {agreement.selfRegistration ? 'Upload signed copy' : 'Return to sales'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={returnTarget != null} onOpenChange={(open) => !open && closeReturn()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selfRegistration ? 'Upload signed agreement' : 'Return signed agreement'}
            </DialogTitle>
          </DialogHeader>
          {returnTarget ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selfRegistration ? (
                  <>
                    Upload your signed copy of <strong>{returnTarget.title}</strong>. It will be
                    saved to your profile for CROSSUB staff to review in the admin portal.
                  </>
                ) : (
                  <>
                    Send <strong>{returnTarget.title}</strong> back to{' '}
                    {returnTarget.assignedSalesperson || 'your salesperson'}. You can attach the
                    signed PDF and add a short note.
                  </>
                )}
              </p>
              <div className="space-y-2">
                <Label htmlFor="signed-file">
                  Signed copy{selfRegistration ? '' : ' (optional)'}
                </Label>
                <input
                  ref={fileInputRef}
                  id="signed-file"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" />
                  {file ? file.name : 'Choose signed document'}
                </Button>
              </div>
              {!selfRegistration ? (
                <div className="space-y-2">
                  <Label htmlFor="return-notes">Note to salesperson (optional)</Label>
                  <Textarea
                    id="return-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Signed by the agency principal today."
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closeReturn} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleReturn()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {selfRegistration ? 'Uploading…' : 'Sending…'}
                </>
              ) : selfRegistration ? (
                'Upload signed copy'
              ) : (
                'Send to salesperson'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        doc={previewDoc}
        subtitle={previewSubtitle}
        open={previewDoc != null}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewSubtitle(undefined);
        }}
      />
    </AgentShell>
  );
}
