'use client';

import { Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { InfoPanel } from '@/components/agent/info-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAgencyTeam,
  inviteAgencyTeamMember,
  removeAgencyTeamMember,
  type AgencyTeamMember,
  type AgencyTeamResponse,
} from '@/lib/crossub-api/agent-client';
import { cn } from '@/lib/utils';

function memberName(member: AgencyTeamMember): string {
  const parts = [member.firstName, member.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : member.email;
}

export function AgencyTeamPanel({
  agencyId,
  canManage,
  title = 'Agency team',
  currentUserId,
}: {
  agencyId: string;
  canManage: boolean;
  title?: string;
  currentUserId?: string;
}) {
  const [team, setTeam] = useState<AgencyTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

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
      toast.error('Enter the agent email');
      return;
    }
    setInviting(true);
    try {
      const result = await inviteAgencyTeamMember(agencyId, {
        email,
        contactName: inviteName.trim() || undefined,
      });
      if (result.alreadyRegistered) {
        toast.success('Existing user linked — password reset emailed');
      } else {
        toast.success('Invite sent');
      }
      setInviteEmail('');
      setInviteName('');
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

  return (
    <InfoPanel title={title} icon={Users}>
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading team…
        </div>
      ) : team && team.members.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {team.members.map((member) => {
            const isSelf = currentUserId != null && member.userId === currentUserId;
            return (
              <li key={member.userId} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {memberName(member)}
                    {isSelf ? (
                      <span className="text-muted-foreground ml-1.5 text-xs font-normal">(You)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs break-all">
                    <Mail className="size-3 shrink-0" />
                    {member.email}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {member.tier === 'PRINCIPAL' ? 'Principal' : 'Agent'}
                    {' · '}
                    {member.assignedPropertyCount} propert
                    {member.assignedPropertyCount === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                {canManage && member.tier !== 'PRINCIPAL' ? (
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
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      member.tier === 'PRINCIPAL'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {member.tier === 'PRINCIPAL' ? 'Principal' : 'Agent'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No team members yet.</p>
      )}

      {canManage && (
        <div className="mt-4 space-y-3 rounded-xl border border-dashed p-3">
          <p className="text-sm font-medium">Invite agent</p>
          <div className="space-y-2">
            <Label htmlFor="team-invite-name">Name (optional)</Label>
            <Input
              id="team-invite-name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Jordan Lee"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-invite-email">Agent email</Label>
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
                Send invite
              </>
            )}
          </Button>
        </div>
      )}
    </InfoPanel>
  );
}
