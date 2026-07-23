'use client';

import { useMemo } from 'react';

import { RentReconciliationDialog } from '@/components/accounting/rent-reconciliation-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { buildRentReconciliationProperty } from '@/lib/rent-reconciliation';
import type { Property, PropertyAccounting } from '@/lib/types';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';

export function RentReconciliationCaseDialog({
  open,
  onOpenChange,
  propertyId,
  property,
  fallbackAccounting,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  property: Property;
  fallbackAccounting?: PropertyAccounting | null;
  onSubmitted?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const { detail, refresh } = usePropertyPortalDetail(propertyId, apiConnected && open);

  const reconProperty = useMemo(
    () =>
      buildRentReconciliationProperty({
        property,
        accounting: detail?.accounting,
        financial: detail?.financial,
        fallbackAccounting: fallbackAccounting ?? undefined,
        rentPaidUntil: detail?.overview?.rentPaidUntilDate ?? property.rentPaidUntil,
      }),
    [property, detail, fallbackAccounting],
  );

  return (
    <RentReconciliationDialog
      open={open}
      onOpenChange={onOpenChange}
      propertyId={propertyId}
      property={reconProperty}
      onSubmitted={() => {
        void refresh();
        onSubmitted?.();
      }}
    />
  );
}
