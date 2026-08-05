'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import {
  CreateInspectionWizard,
  INSPECTION_CREATE_TYPE_OPTIONS,
  type InspectionCreateType,
} from '@/components/inspections/create-inspection-wizard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { tribunalDetail } from '@/constants/routes';

export type PricingOrderActions = {
  addRoutine: () => void;
  addOpen: () => void;
  addIngoing: () => void;
  addOutgoing: () => void;
  addTribunal: () => void;
};

export function PricingOrderHost({
  children,
}: {
  children: (actions: PricingOrderActions) => React.ReactNode;
}) {
  const router = useRouter();
  const { properties, refresh } = useAgentData();
  const [inspectionType, setInspectionType] = useState<InspectionCreateType | null>(null);
  const [tribunalOpen, setTribunalOpen] = useState(false);

  const createOption = INSPECTION_CREATE_TYPE_OPTIONS.find((option) => option.id === inspectionType);

  const actions: PricingOrderActions = {
    addRoutine: () => setInspectionType('ROUTINE'),
    addOpen: () => setInspectionType('OPEN'),
    addIngoing: () => setInspectionType('INGOING'),
    addOutgoing: () => setInspectionType('OUTGOING'),
    addTribunal: () => setTribunalOpen(true),
  };

  return (
    <>
      {children(actions)}

      <Dialog open={inspectionType !== null} onOpenChange={(open) => !open && setInspectionType(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createOption?.scheduleLabel ?? 'Add inspection'}</DialogTitle>
            <DialogDescription>
              {createOption?.description ??
                'Choose a property and confirm details to place your order.'}
            </DialogDescription>
          </DialogHeader>
          <CreateInspectionWizard
            key={inspectionType ?? 'none'}
            initialType={inspectionType}
            hideTypePicker
            onCreated={() => {
              setInspectionType(null);
              void refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <CreateTribunalRentChasingDialog
        open={tribunalOpen}
        onOpenChange={setTribunalOpen}
        properties={properties}
        mode="tribunal"
        onCreated={(caseId) => {
          setTribunalOpen(false);
          void refresh();
          router.push(tribunalDetail(caseId));
        }}
      />
    </>
  );
}
