'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { propertyJobDisplayName } from '@/lib/property-portal-documents';
import { buildTransferOutPackage } from '@/lib/transfer-out-package';
import type { Property } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function PropertyTransferPage() {
  const { apiConnected, properties, documents } = useAgentData();
  const [receivingAgentEmail, setReceivingAgentEmail] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  );

  const propertyDocuments = useMemo(() => {
    if (!selectedProperty) return [];
    const key = `${selectedProperty.address}, ${selectedProperty.suburb}`.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.propertyAddress.toLowerCase() === key ||
        doc.propertyAddress.toLowerCase().includes(selectedProperty.address.toLowerCase()),
    );
  }, [documents, selectedProperty]);

  const downloadPackage = async () => {
    if (!selectedProperty) {
      toast.error('Select a property to transfer out');
      return;
    }
    if (!isValidEmail(receivingAgentEmail)) {
      toast.error('Enter a valid receiving agent email');
      return;
    }

    setDownloading(true);
    try {
      const result = await buildTransferOutPackage({
        property: selectedProperty,
        receivingAgentEmail: receivingAgentEmail.trim(),
        agentDocuments: documents,
        apiConnected,
      });
      if (result.documentCount === 0) {
        toast.success('Transfer package downloaded — summary included; no property files were available yet');
      } else if (result.skippedCount > 0) {
        toast.success(
          `Downloaded package with ${result.documentCount} file${result.documentCount === 1 ? '' : 's'} (${result.skippedCount} could not be fetched)`,
        );
      } else {
        toast.success(`Downloaded transfer package with ${result.documentCount} documents`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not build transfer package');
    } finally {
      setDownloading(false);
    }
  };

  const mailtoHandover = () => {
    if (!selectedProperty || !isValidEmail(receivingAgentEmail)) return;
    const address = propertyJobDisplayName(selectedProperty);
    const subject = encodeURIComponent(`Property transfer OUT — ${address}`);
    const body = encodeURIComponent(
      [
        `Hi,`,
        ``,
        `Please find attached the transfer OUT package for ${address}.`,
        ``,
        `The zip includes a property summary (open property-transfer-summary.html and print to PDF) and all documents from our property profile.`,
        ``,
        `Regards`,
      ].join('\n'),
    );
    window.location.href = `mailto:${receivingAgentEmail.trim()}?subject=${subject}&body=${body}`;
  };

  return (
    <AgentShell title="Transfer OUT" backHref={ROUTES.TASKS} backLabel="Tasks">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Hand a property over to another managing agent. Choose the property, enter their email,
          and download a zip with the property summary and every document on the property profile.
        </p>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="receivingAgentEmail">Receiving agent email</Label>
            <Input
              id="receivingAgentEmail"
              type="email"
              value={receivingAgentEmail}
              onChange={(e) => setReceivingAgentEmail(e.target.value)}
              placeholder="agent@agency.com.au"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property">Property to transfer out</Label>
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
        </div>

        {selectedProperty ? (
          <div className="space-y-3 rounded-xl border bg-secondary/20 p-4">
            <div className="flex items-start gap-2">
              <FileText className="text-primary mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">Package preview</p>
                <p className="text-muted-foreground text-xs">
                  Includes property profile summary plus documents from the property&apos;s Documents
                  tab and portfolio repository.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Address</dt>
                <dd className="font-medium">{propertyJobDisplayName(selectedProperty)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Landlord</dt>
                <dd>{selectedProperty.homeOwnerName || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Tenant</dt>
                <dd>{selectedProperty.tenantName || 'Vacant'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Rent</dt>
                <dd>
                  {selectedProperty.rentWeekly > 0
                    ? `${formatCurrency(selectedProperty.rentWeekly)}/wk`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Lease</dt>
                <dd className="capitalize">{selectedProperty.leaseStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                  Known documents
                </dt>
                <dd>
                  {propertyDocuments.length > 0
                    ? `${propertyDocuments.length} in portfolio`
                    : apiConnected
                      ? 'Will load from property profile'
                      : 'Summary only (offline)'}
                </dd>
              </div>
            </dl>

            {selectedProperty.leaseEnd ? (
              <p className="text-muted-foreground text-xs">
                Lease end {formatDate(selectedProperty.leaseEnd)}
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          className="w-full"
          disabled={downloading || !selectedPropertyId || !receivingAgentEmail.trim()}
          onClick={() => void downloadPackage()}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? 'Building package…' : 'Download transfer package'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!selectedPropertyId || !isValidEmail(receivingAgentEmail)}
          onClick={mailtoHandover}
        >
          <Mail className="size-4" />
          Open email to receiving agent
        </Button>

        <p className="text-muted-foreground text-xs">
          The zip contains <strong>property-transfer-summary.html</strong> (print to PDF) and a{' '}
          <strong>documents/</strong> folder. Attach the zip to your email after downloading.
        </p>
      </div>
    </AgentShell>
  );
}
