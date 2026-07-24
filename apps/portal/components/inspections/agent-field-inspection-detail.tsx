'use client';

import { OutgoingFieldInspectionDetail } from '@/components/inspections/outgoing-field-inspection-detail';
import { IngoingInspectionAgentDetail } from '@/components/inspections/ingoing-inspection-agent-detail';
import type { Inspection } from '@/lib/types';

/**
 * Agent read-only field inspection router — ingoing and outgoing job cases.
 */
export function AgentFieldInspectionDetail({
  inspection,
  apiConnected,
  onIngoingCancelled,
}: {
  inspection: Inspection;
  apiConnected: boolean;
  onIngoingCancelled?: () => void;
}) {
  if (inspection.type === 'OUTGOING') {
    return (
      <OutgoingFieldInspectionDetail inspection={inspection} apiConnected={apiConnected} />
    );
  }

  if (inspection.type === 'INGOING') {
    return (
      <IngoingInspectionAgentDetail
        inspection={inspection}
        apiConnected={apiConnected}
        onCancelled={onIngoingCancelled}
      />
    );
  }

  return (
    <p className="text-muted-foreground py-8 text-center text-sm">
      This inspection type is not supported in the field inspection view.
    </p>
  );
}
