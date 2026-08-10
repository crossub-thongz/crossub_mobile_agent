import type { BillableInspectionType } from '@/lib/billing/resolve-billing-inspection-id';
import { resolveBillingInspectionId } from '@/lib/billing/resolve-billing-inspection-id';
import {
  ensureAgentInspectionPlatformCharge,
  fetchAgentInspectionPlatformCharge,
  quoteAgentBillingCharge,
  type AgentBillingCharge,
} from '@/lib/crossub-api/agent-billing-client';

const SERVICE_TYPE: Record<
  BillableInspectionType,
  'open_inspection' | 'routine_inspection' | 'ingoing_inspection' | 'outgoing_inspection'
> = {
  OPEN: 'open_inspection',
  INGOING: 'ingoing_inspection',
  OUTGOING: 'outgoing_inspection',
  ROUTINE: 'routine_inspection',
};

function uniqueCandidateIds(...values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of values) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Lookup only — never create a charge while browsing the case. */
async function fetchLinkedChargeByIds(candidateIds: string[]): Promise<AgentBillingCharge | null> {
  for (const id of candidateIds) {
    const linked = await fetchAgentInspectionPlatformCharge(id);
    if (linked) return linked;
  }
  return null;
}

async function ensureLinkedChargeByIds(
  candidateIds: string[],
): Promise<{ charge: AgentBillingCharge | null; error?: string }> {
  let lastError: string | undefined;
  for (const id of candidateIds) {
    try {
      const linked = await ensureAgentInspectionPlatformCharge(id);
      if (linked) return { charge: linked };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Could not prepare payment';
    }
  }
  return { charge: null, error: lastError };
}

async function quoteLinkedCharge(args: {
  candidateIds: string[];
  propertyId?: string;
  inspectionType?: BillableInspectionType;
}): Promise<{ charge: AgentBillingCharge | null; error?: string }> {
  if (!args.propertyId || !args.inspectionType) {
    return { charge: null };
  }

  let lastError: string | undefined;
  for (const id of args.candidateIds) {
    try {
      const quoted = await quoteAgentBillingCharge({
        serviceType: SERVICE_TYPE[args.inspectionType],
        propertyId: args.propertyId,
        inspectionId: id,
      });
      if (quoted) return { charge: quoted };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Could not prepare payment';
    }
  }

  // Last resort: quote by property + type without a resolvable inspection id.
  if (args.candidateIds.length === 0) {
    try {
      const quoted = await quoteAgentBillingCharge({
        serviceType: SERVICE_TYPE[args.inspectionType],
        propertyId: args.propertyId,
      });
      if (quoted) return { charge: quoted };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Could not prepare payment';
    }
  }

  return { charge: null, error: lastError };
}

async function createMissingCharge(args: {
  candidateIds: string[];
  propertyId?: string;
  inspectionType?: BillableInspectionType;
}): Promise<{ charge: AgentBillingCharge | null; error?: string }> {
  const ensured = await ensureLinkedChargeByIds(args.candidateIds);
  if (ensured.charge) return ensured;

  const quoted = await quoteLinkedCharge(args);
  if (quoted.charge) return quoted;

  return { charge: null, error: quoted.error ?? ensured.error };
}

function buildCandidateIds(args: {
  billingInspectionId: string;
  inspectionId: string;
  poolInspectionId?: string;
  viewingSessionId?: string;
}): string[] {
  return uniqueCandidateIds(
    args.billingInspectionId,
    args.poolInspectionId,
    args.inspectionId,
    args.viewingSessionId,
  );
}

/** Create a charge if needed, then return it (for manual Pay click only). */
export async function prepareInspectionPlatformCharge(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
  poolInspectionId?: string;
}): Promise<{
  charge: AgentBillingCharge | null;
  billingInspectionId: string;
  error?: string;
}> {
  const loaded = await loadInspectionPlatformCharge(args);
  if (loaded.charge?.status === 'paid') return loaded;
  if (loaded.charge?.status === 'awaiting_payment') return loaded;

  const candidateIds = buildCandidateIds({
    billingInspectionId: loaded.billingInspectionId,
    inspectionId: args.inspectionId,
    poolInspectionId: args.poolInspectionId,
    viewingSessionId: args.viewingSessionId,
  });

  const created = await createMissingCharge({
    candidateIds,
    propertyId: args.propertyId,
    inspectionType: args.inspectionType,
  });

  return {
    charge: created.charge,
    billingInspectionId: loaded.billingInspectionId,
    error: created.error,
  };
}

/**
 * Load the platform charge linked to this inspection job (read-only).
 * Charges are created when the agent clicks Pay — not while opening the case.
 */
export async function loadInspectionPlatformCharge(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
  /** When known, skip session→pool resolution. */
  poolInspectionId?: string;
}): Promise<{ charge: AgentBillingCharge | null; billingInspectionId: string }> {
  let billingInspectionId =
    args.poolInspectionId?.trim() ||
    (await resolveBillingInspectionId({
      inspectionId: args.inspectionId.trim(),
      propertyId: args.propertyId,
      viewingSessionId: args.viewingSessionId,
      inspectionType: args.inspectionType,
    }));

  let candidateIds = buildCandidateIds({
    billingInspectionId,
    inspectionId: args.inspectionId,
    poolInspectionId: args.poolInspectionId,
    viewingSessionId: args.viewingSessionId,
  });

  let charge = await fetchLinkedChargeByIds(candidateIds);

  if (!charge) {
    const retried = await resolveBillingInspectionId({
      inspectionId: '',
      propertyId: args.propertyId,
      viewingSessionId: args.viewingSessionId,
      inspectionType: args.inspectionType,
    });
    if (retried && retried !== billingInspectionId) {
      billingInspectionId = retried;
      candidateIds = buildCandidateIds({
        billingInspectionId,
        inspectionId: args.inspectionId,
        poolInspectionId: args.poolInspectionId,
        viewingSessionId: args.viewingSessionId,
      });
      charge = await fetchLinkedChargeByIds(candidateIds);
    }
  }

  return { charge, billingInspectionId };
}
