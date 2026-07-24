'use client';

import { OutgoingFieldInspectionDetail } from '@/components/inspections/outgoing-field-inspection-detail';
import { IngoingInspectionAgentDetail } from '@/components/inspections/ingoing-inspection-agent-detail';
import { OpenInspectionAgentDetail } from '@/components/inspections/open-inspection-agent-detail';
import type { Inspection } from '@/lib/types';

/**
 * Agent read-only field inspection router — ingoing, outgoing, and open job cases.
 */
export function AgentFieldInspectionDetail({
  inspection,
  apiConnected,
  embedded = false,
  onClose,
  onIngoingCancelled,
}: {
  inspection: Inspection;
  apiConnected: boolean;
  embedded?: boolean;
  onClose?: () => void;
  onIngoingCancelled?: () => void;
}) {
  if (inspection.type === 'OPEN') {
    return (
      <OpenInspectionAgentDetail
        inspection={inspection}
        apiConnected={apiConnected}
        embedded={embedded}
        onDeleted={onClose}
      />
    );
  }

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
