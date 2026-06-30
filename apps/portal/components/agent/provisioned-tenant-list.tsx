'use client';

import Link from 'next/link';
import { ChevronRight, Mail, User } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/agent/empty-state';
import { ProvisionedTenantCredentialsDialog } from '@/components/agent/provisioned-tenant-credentials-dialog';
import { StatusBadge } from '@/components/agent/status-badge';
import { Button } from '@/components/ui/button';
import { ROUTES, tenantNew } from '@/constants/routes';
import type { ProvisionedTenantRecord } from '@/lib/provisioned-tenant-records';
import { formatDateTime } from '@/lib/utils';

function statusVariant(
  status: string,
): 'default' | 'approval' | 'success' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING_INVITE') return 'approval';
  return 'default';
}

function statusLabel(status: string): string {
  if (status === 'PENDING_INVITE') return 'Pending invite';
  if (status === 'ACTIVE') return 'Active';
  if (status === 'DISABLED') return 'Disabled';
  return status;
}

export function ProvisionedTenantList({
  records,
  showAddButton = true,
}: {
  records: ProvisionedTenantRecord[];
  showAddButton?: boolean;
}) {
  const [selected, setSelected] = useState<ProvisionedTenantRecord | null>(null);

  if (records.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No tenant accounts yet"
        description="Create a tenant login after approving an application. Credentials are shared with the tenant for the CROSSUB Tenant App."
        action={
          showAddButton ? (
            <Button asChild size="sm">
              <Link href={tenantNew()}>Add tenant</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {records.map((record) => (
          <div key={record.id} className="rounded-xl border bg-card">
            <button
              type="button"
              onClick={() => setSelected(record)}
              className="w-full p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {record.firstName} {record.lastName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{record.email}</span>
                  </p>
                  {record.applicationLabel ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Application: {record.applicationLabel}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Created {formatDateTime(record.provisionedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge
                    label={statusLabel(record.status)}
                    variant={statusVariant(record.status)}
                  />
                  <span className="text-primary flex items-center gap-0.5 text-[10px] font-medium">
                    View credentials
                    <ChevronRight className="size-3" />
                  </span>
                </div>
              </div>
            </button>
            {record.selectionId ? (
              <div className="border-t px-4 py-2">
                <Link
                  href={`${ROUTES.TENANT_SELECTION}/${record.selectionId}`}
                  className="text-primary text-xs font-medium"
                >
                  View tenant selection →
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <ProvisionedTenantCredentialsDialog
        record={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
