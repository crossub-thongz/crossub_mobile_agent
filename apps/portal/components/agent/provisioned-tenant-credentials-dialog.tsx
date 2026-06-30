'use client';

import { Copy, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProvisionedTenantRecord } from '@/lib/provisioned-tenant-records';

const tenantAppUrl =
  process.env.NEXT_PUBLIC_TENANT_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3003';

export function ProvisionedTenantCredentialsDialog({
  record,
  open,
  onClose,
}: {
  record: ProvisionedTenantRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) setShowPassword(false);
  }, [open]);

  if (!record) return null;

  const fullName = `${record.firstName} ${record.lastName}`.trim();
  const hasPassword = Boolean(record.password);

  const copyCredentials = async () => {
    if (!record.password) {
      toast.error('Password not saved for this account');
      return;
    }
    const text = [
      'CROSSUB Tenant App login',
      `Email: ${record.email}`,
      `Password: ${record.password}`,
      `Sign in: ${tenantAppUrl}/login`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credentials copied');
    } catch {
      toast.error('Could not copy credentials');
    }
  };

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title="Tenant credentials"
      subtitle={fullName || record.email}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Use these credentials to sign in to the{' '}
          <a
            href={`${tenantAppUrl}/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            CROSSUB Tenant App
          </a>
          . The tenant app must use the same API as this agent portal (localhost:3001 in dev).
        </p>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Username (email)</dt>
            <dd className="mt-1 font-medium">{record.email}</dd>
          </div>
          {record.phone ? (
            <div>
              <dt className="text-muted-foreground text-xs">Phone</dt>
              <dd className="mt-1 font-medium">{record.phone}</dd>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="tenant-credential-password">Password</Label>
            {hasPassword ? (
              <div className="relative">
                <Input
                  id="tenant-credential-password"
                  readOnly
                  type={showPassword ? 'text' : 'password'}
                  value={record.password}
                  className="bg-muted/50 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Password was not saved for this account (created before credential storage was
                enabled). Create a new login or use a password you noted at creation time.
              </p>
            )}
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={() => void copyCredentials()} disabled={!hasPassword}>
            <Copy className="size-4" />
            Copy credentials
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={`${tenantAppUrl}/login`} target="_blank" rel="noopener noreferrer">
              Open tenant app sign-in
            </a>
          </Button>
        </div>
      </div>
    </CaseDetailDialog>
  );
}
