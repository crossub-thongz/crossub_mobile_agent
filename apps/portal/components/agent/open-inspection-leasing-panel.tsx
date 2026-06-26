'use client';

import { useState } from 'react';
import { Calendar, Users } from 'lucide-react';

import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { Button } from '@/components/ui/button';
import { fromProperty } from '@/lib/detail-navigation';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
} from '@/lib/open-inspection';
import type { Inspection } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function OpenInspectionLeasingPanel({
  inspection,
  propertyId,
}: {
  inspection: Inspection;
  propertyId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div>
          <p className="text-primary text-xs font-semibold uppercase">Current leasing</p>
          <p className="mt-1 text-sm font-semibold">Open inspection</p>
          <p className="text-muted-foreground text-xs">{inspection.status}</p>
        </div>

        <div className="space-y-1 text-xs">
          {inspection.scheduledAt && (
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground size-3 shrink-0" />
              <span>{formatDateTime(inspection.scheduledAt)}</span>
            </div>
          )}
          {inspection.inspector && (
            <p className="text-muted-foreground">Officer: {inspection.inspector}</p>
          )}
          {inspection.openConductedBy && (
            <p className="text-muted-foreground">
              Conducted by: {OPEN_CONDUCTED_BY_LABEL[inspection.openConductedBy]}
            </p>
          )}
          {inspection.openListingContext && (
            <p className="text-muted-foreground">
              Listing: {OPEN_LISTING_CONTEXT_LABEL[inspection.openListingContext]}
            </p>
          )}
          {inspection.visitorCount != null && (
            <div className="flex items-center gap-1.5 pt-1">
              <Users className="text-muted-foreground size-3" />
              <span>{inspection.visitorCount} visitors recorded</span>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setDialogOpen(true)}
        >
          View inspection details
        </Button>
      </div>

      <InspectionDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        inspection={inspection}
        navContext={fromProperty(propertyId, 'Leasing')}
      />
    </>
  );
}
