'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  CreateInspectionWizard,
  INSPECTION_CREATE_TYPE_OPTIONS,
  InspectionCreateTypeButtons,
  type InspectionCreateType,
} from '@/components/inspections/create-inspection-wizard';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export default function NewInspectionPage() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('property');
  const typeParam = searchParams.get('type') as InspectionCreateType | null;
  const initialType =
    typeParam && INSPECTION_CREATE_TYPE_OPTIONS.some((option) => option.id === typeParam)
      ? typeParam
      : null;
  const [selectedType, setSelectedType] = useState<InspectionCreateType | null>(initialType);

  const createOption = INSPECTION_CREATE_TYPE_OPTIONS.find((option) => option.id === selectedType);

  if (!selectedType) {
    return (
      <AgentShell title="Add inspection" backHref={ROUTES.INSPECTIONS}>
        <InspectionCreateTypeButtons onSelect={setSelectedType} />
      </AgentShell>
    );
  }

  return (
    <AgentShell
      title={createOption?.scheduleLabel ?? 'Add inspection'}
      backHref={ROUTES.INSPECTIONS}
    >
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
          Change inspection type
        </Button>
        <CreateInspectionWizard
          preselectedPropertyId={propertyId}
          initialType={selectedType}
          hideTypePicker
          hidePropertySelect={Boolean(propertyId)}
        />
      </div>
    </AgentShell>
  );
}
