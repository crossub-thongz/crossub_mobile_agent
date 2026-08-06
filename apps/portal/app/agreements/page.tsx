'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FileSignature, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
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
import { fileToBase64WithProgress } from '@/lib/file-upload';
import {
  fetchSalesAgreementAccessStatus,
  fetchSalesAgreements,
  returnSalesAgreement,
  type AgentSalesAgreement,
  type AgentSalesAgreementAccessStatus,
} from '@/lib/crossub-api/agent-client';
import { formatDateTime } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Awaiting signature' },
  { id: 'returned', label: 'Returned' },
  { id: 'signed', label: 'Signed' },
  { id: 'declined', label: 'Rejected' },
];

function statusLabel(status: AgentSalesAgreement['status']): string {
  switch (status) {
    case 'sent':
      return 'Awaiting signature';
    case 'returned':
      return 'Returned to sales';
    case 'signed':
      return 'Signed';
    case 'declined':
      return 'Rejected by sales';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.success('Agreement returned to your salesperson');
      closeReturn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not return agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Agreements">
      <div className="space-y-4">
        {access?.blocked ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
            {access.awaitingSalesApproval ? (
              <p>
                Your signed agreement has been returned to your salesperson. The Agent App will
                unlock once they review and approve it.
              </p>
            ) : access.pendingCount > 0 ? (
              <p>
                Your Agent Portal access is limited to service agreements until your salesperson
                confirms the signed copy. Review each document below, sign offline if needed, then
                return the signed copy to your salesperson.
              </p>
            ) : (
              <p>
                Your Agent Portal access is limited to this page until your service agreement is
                confirmed. Your salesperson will send the document here for you to review and
                return.
              </p>
            )}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Service agreements sent from CROSSUB Sales for your agency. Review each document, sign
          offline if needed, then return the signed copy to your salesperson.
        </p>

        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

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
                ? 'When Sales sends a service agreement for your agency, it will appear here.'
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
                      <StatusBadge label={statusLabel(agreement.status)} variant={statusVariant(agreement.status)} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{agreement.agencyName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sales contact: {agreement.assignedSalesperson}
                      {agreement.sentAt ? ` · Sent ${formatDateTime(agreement.sentAt)}` : null}
                    </p>
                    {agreement.agentReturnedAt ? (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                        Returned {formatDateTime(agreement.agentReturnedAt)}
                      </p>
                    ) : null}
                    {agreement.status === 'returned' ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                        Waiting for {agreement.assignedSalesperson || 'your salesperson'} to approve
                        this agreement.
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
                    {agreement.documentUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={agreement.documentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 size-3.5" />
                          View agreement
                        </a>
                      </Button>
                    ) : null}
                    {agreement.returnedDocumentUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={agreement.returnedDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Signed copy
                        </a>
                      </Button>
                    ) : null}
                    {agreement.status === 'sent' ? (
                      <Button size="sm" onClick={() => openReturn(agreement)}>
                        Return to sales
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
            <DialogTitle>Return signed agreement</DialogTitle>
          </DialogHeader>
          {returnTarget ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send <strong>{returnTarget.title}</strong> back to{' '}
                {returnTarget.assignedSalesperson || 'your salesperson'}. You can attach the signed
                PDF and add a short note.
              </p>
              <div className="space-y-2">
                <Label htmlFor="signed-file">Signed copy (optional)</Label>
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
                  Sending…
                </>
              ) : (
                'Send to salesperson'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgentShell>
  );
}
