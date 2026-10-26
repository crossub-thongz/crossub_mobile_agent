'use client';

import { Landmark, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TrustBankAccountFields } from '@/components/agent/trust/trust-bank-account-fields';
import { TrustPanel } from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRUST_INPUT_LIMITS, TRUST_PAGE_COPY, TRUST_SETUP_COPY as COPY } from '@/constants/trust';
import { setupTrustAccount, type AgentTrustWorkspace } from '@/lib/crossub-api/agent-trust-client';
import { trustBankAccountDraft, trustSetupInput } from '@/lib/trust-setup';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Self-serve trust set-up (D132 as amended 26 Oct 2026): replaces "Ask CROSSUB". Creates the
 * agency's trust workspace when it has none, then its first trust bank account with the ABA
 * details. `needsWorkspace` is false when the workspace exists without a bank account.
 */
export function TrustSetupForm({
  agencyId,
  agencyName,
  needsWorkspace,
  onDone,
}: {
  agencyId: string;
  agencyName: string;
  needsWorkspace: boolean;
  onDone: (workspace: AgentTrustWorkspace) => void;
}) {
  const [workspaceName, setWorkspaceName] = useState(agencyName);
  const [draft, setDraft] = useState(() => trustBankAccountDraft());
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const checked = trustSetupInput(draft, needsWorkspace ? workspaceName : null);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    setPending(true);
    try {
      const workspace = await setupTrustAccount(agencyId, checked.value);
      toast.success(COPY.done);
      onDone(workspace);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <TrustPanel>
      <div className="mb-4 flex items-start gap-3">
        <Landmark className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{TRUST_PAGE_COPY.notSetUpTitle}</p>
          <p className="text-muted-foreground text-sm">{COPY.description}</p>
        </div>
      </div>
      <div className="max-w-2xl space-y-4">
        {needsWorkspace ? (
          <div className="space-y-1.5">
            <Label htmlFor="trust-setup-workspace">{COPY.workspaceName}</Label>
            <Input
              id="trust-setup-workspace"
              value={workspaceName}
              maxLength={TRUST_INPUT_LIMITS.workspaceNameMax}
              disabled={pending}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{COPY.workspaceNameHint}</p>
          </div>
        ) : null}
        <TrustBankAccountFields draft={draft} onChange={setDraft} disabled={pending} idPrefix="trust-setup" />
        <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {COPY.submit}
        </Button>
      </div>
    </TrustPanel>
  );
}
