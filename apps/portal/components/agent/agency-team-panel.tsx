'use client';

import { ClipboardCheck, Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { InfoPanel } from '@/components/agent/info-panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AGENCY_INVITE_TIER_HINT, AGENCY_TEAM_INVITE_COPY as INVITE_COPY } from '@/constants/agency-team';
import {
  AGENCY_INVITE_TIERS,
  AGENCY_MEMBERSHIP_TIER,
  AGENCY_MEMBERSHIP_TIER_LABEL,
} from '@/constants/api-enums';
import { AGENCY_INSPECTOR_TEAM_COPY as INSPECTOR_COPY } from '@/constants/self-managed-inspections';
import {
  fetchAgencyTeam,
  inviteAgencyTeamMember,
  removeAgencyTeamMember,
  type AgencyTeamMember,
  type AgencyTeamResponse,
  type InviteAgencyTeamMemberInput,
} from '@/lib/crossub-api/agent-client';
import {
  grantAgencyInspector,
  revokeAgencyInspector,
} from '@/lib/crossub-api/agent-inspection-client';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function memberName(member: AgencyTeamMember): string {
  const parts = [member.firstName, member.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : member.email;
}

export function AgencyTeamPanel({
  agencyId,
  canManage,
  title = 'Agency team',
  currentUserId,
  selectedMemberId,
  onSelectMember,
  showPropertyCounts = true,
  selfManaged = false,
}: {
  agencyId: string;
  canManage: boolean;
  title?: string;
  currentUserId?: string;
  selectedMemberId?: string | null;
  onSelectMember?: (userId: string | null) => void;
  showPropertyCounts?: boolean;
  /**
   * Self-Manage agency: show agency inspectors, let a principal add or remove them, and let a
   * principal invite an accountant.
   */
  selfManaged?: boolean;
}) {
  const [team, setTeam] = useState<AgencyTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteTier, setInviteTier] = useState<InviteAgencyTeamMemberInput['tier']>(
    AGENCY_MEMBERSHIP_TIER.AGENT,
  );
  const [inviting, setInviting] = useState(false);
  const [inspectorBusyId, setInspectorBusyId] = useState<string | null>(null);
  const [removeInspector, setRemoveInspector] = useState<AgencyTeamMember | null>(null);
  const canManageInspectors = selfManaged && canManage;

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await fetchAgencyTeam(agencyId));
    } catch {
      toast.error('Could not load agency team');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  async function onInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error(INVITE_COPY.emailRequired);
      return;
    }
    setInviting(true);
    try {
      const result = await inviteAgencyTeamMember(agencyId, {
        email,
        contactName: inviteName.trim() || undefined,
        tier: inviteTier,
      });
      if (result.alreadyRegistered) {
        toast.success('Existing user linked — password reset emailed');
      } else {
        toast.success('Invite sent');
      }
      setInviteEmail('');
      setInviteName('');
      setInviteTier(AGENCY_MEMBERSHIP_TIER.AGENT);
      await loadTeam();
    } catch {
      toast.error('Could not send invite');
    } finally {
      setInviting(false);
    }
  }

  async function onRemove(userId: string) {
    try {
      const next = await removeAgencyTeamMember(agencyId, userId);
      setTeam(next);
      toast.success('Team member removed');
    } catch {
      toast.error('Could not remove team member');
    }
  }

  async function onGrantInspector(userId: string) {
    setInspectorBusyId(userId);
    try {
      setTeam(await grantAgencyInspector(agencyId, userId));
      toast.success(INSPECTOR_COPY.granted);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setInspectorBusyId(null);
    }
  }

  async function onConfirmRemoveInspector() {
    if (!removeInspector) return;
    const userId = removeInspector.userId;
    setInspectorBusyId(userId);
    try {
      setTeam(await revokeAgencyInspector(agencyId, userId));
      toast.success(INSPECTOR_COPY.revoked);
      setRemoveInspector(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setInspectorBusyId(null);
    }
  }

  return (
    <InfoPanel title={title} icon={Users}>
      {onSelectMember ? (
        <p className="text-muted-foreground mb-3 text-xs">
          Tap an agent to sort their properties below.
        </p>
      ) : null}
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading team…
        </div>
      ) : team && team.members.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {team.members.map((member) => {
            const isSelf = currentUserId != null && member.userId === currentUserId;
            const selected = selectedMemberId === member.userId;
            const isPrincipalMember = member.tier === AGENCY_MEMBERSHIP_TIER.PRINCIPAL;
            const canRemove = canManage && !isPrincipalMember;
            const showInspector = selfManaged && member.isAgencyInspector;
            const identity = (
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {memberName(member)}
                  {isSelf ? (
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">(You)</span>
                  ) : null}
                  {showInspector ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                      <ClipboardCheck className="size-3" />
                      {INSPECTOR_COPY.badge}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs break-all">
                  <Mail className="size-3 shrink-0" />
                  {member.email}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {AGENCY_MEMBERSHIP_TIER_LABEL[member.tier]}
                  {showPropertyCounts
                    ? ` · ${member.assignedPropertyCount} propert${member.assignedPropertyCount === 1 ? 'y' : 'ies'}`
                    : ''}
                </p>
              </div>
            );
            return (
              <li
                key={member.userId}
                className={cn(
                  'flex items-start justify-between gap-3 p-3',
                  selected && 'bg-primary/10',
                )}
              >
                <div className="min-w-0 flex-1">
                  {onSelectMember ? (
                    <button
                      type="button"
                      className="min-w-0 w-full text-left"
                      onClick={() => onSelectMember(selected ? null : member.userId)}
                    >
                      {identity}
                    </button>
                  ) : (
                    identity
                  )}
                  {canManageInspectors ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      disabled={inspectorBusyId === member.userId}
                      onClick={() =>
                        member.isAgencyInspector
                          ? setRemoveInspector(member)
                          : void onGrantInspector(member.userId)
                      }
                    >
                      {inspectorBusyId === member.userId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ClipboardCheck className="size-3.5" />
                      )}
                      {member.isAgencyInspector
                        ? INSPECTOR_COPY.removeInspector
                        : INSPECTOR_COPY.makeInspector}
                    </Button>
                  ) : null}
                </div>
                {canRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground shrink-0 hover:text-destructive"
                    aria-label="Remove team member"
                    onClick={() => void onRemove(member.userId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      isPrincipalMember
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {AGENCY_MEMBERSHIP_TIER_LABEL[member.tier]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No team members yet.</p>
      )}

      <Dialog
        open={removeInspector !== null}
        onOpenChange={(open) => {
          if (!open && inspectorBusyId === null) setRemoveInspector(null);
        }}
      >
        <DialogContent elevated className="max-w-md">
          <DialogHeader>
            <DialogTitle>{INSPECTOR_COPY.removeConfirmTitle}</DialogTitle>
            <DialogDescription>
              {removeInspector ? INSPECTOR_COPY.removeConfirmBody(memberName(removeInspector)) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={inspectorBusyId !== null}
              onClick={() => setRemoveInspector(null)}
            >
              {INSPECTOR_COPY.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={inspectorBusyId !== null}
              onClick={() => void onConfirmRemoveInspector()}
            >
              {inspectorBusyId !== null ? <Loader2 className="size-4 animate-spin" /> : null}
              {INSPECTOR_COPY.removeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManage && (
        <div className="mt-4 space-y-3 rounded-xl border border-dashed p-3">
          <p className="text-sm font-medium">{INVITE_COPY.heading}</p>
          {selfManaged ? (
            <div className="space-y-2">
              <Label>{INVITE_COPY.roleLabel}</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={INVITE_COPY.roleLabel}>
                {AGENCY_INVITE_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    role="radio"
                    aria-checked={inviteTier === tier}
                    disabled={inviting}
                    onClick={() => setInviteTier(tier)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      inviteTier === tier
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {AGENCY_MEMBERSHIP_TIER_LABEL[tier]}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">{AGENCY_INVITE_TIER_HINT[inviteTier]}</p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="team-invite-name">{INVITE_COPY.nameLabel}</Label>
            <Input
              id="team-invite-name"
              inputKind="person_name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Jordan Lee"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-invite-email">{INVITE_COPY.emailLabel}</Label>
            <Input
              id="team-invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="agent@agency.example"
              autoComplete="email"
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={inviting}
            onClick={() => void onInvite()}
          >
            {inviting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="size-4" />
                {INVITE_COPY.send}
              </>
            )}
          </Button>
        </div>
      )}
    </InfoPanel>
  );
}
