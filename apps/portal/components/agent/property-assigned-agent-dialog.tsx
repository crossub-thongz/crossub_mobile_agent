'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PROPERTY_EDIT_COPY as COPY } from '@/constants/property-profile-edit';
import { teamMemberName } from '@/lib/agent-conversations';
import {
  assignPropertyAgent,
  fetchAgencyTeam,
  type AgencyTeamMember,
} from '@/lib/crossub-api/agent-client';
import type { Property } from '@/lib/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** No one at the agency looks after the property; sent to the API as null. */
const UNASSIGNED = '';

/** Pick which of the agency's own agents looks after this property. */
export function PropertyAssignedAgentDialog({
  open,
  onOpenChange,
  property,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onSaved?: () => void;
}) {
  const [members, setMembers] = useState<AgencyTeamMember[] | null>(null);
  const [selected, setSelected] = useState(UNASSIGNED);
  const [saving, setSaving] = useState(false);
  const agencyId = property.agencyId;

  useEffect(() => {
    if (!open) return;
    setSelected(property.assignedPortalAgentUserId ?? UNASSIGNED);
    if (!agencyId) return;
    let cancelled = false;
    setMembers(null);
    fetchAgencyTeam(agencyId)
      .then((team) => {
        if (!cancelled) setMembers(team.members);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMembers([]);
          toast.error(apiErrorMessage(err, COPY.teamLoadFailed));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, agencyId, property.assignedPortalAgentUserId]);

  const submit = async () => {
    setSaving(true);
    try {
      await assignPropertyAgent(property.id, selected === UNASSIGNED ? null : selected);
      toast.success(COPY.assignSaved);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't assign the agent"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{COPY.assignTitle}</DialogTitle>
          <DialogDescription>{COPY.assignDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="assigned-agent">{COPY.assignedAgent}</Label>
          {members === null ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
            </p>
          ) : (
            <select
              id="assigned-agent"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value={UNASSIGNED}>{COPY.unassigned}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {teamMemberName(member)}
                </option>
              ))}
            </select>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {COPY.cancel}
          </Button>
          <Button
            type="button"
            disabled={saving || members === null}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
