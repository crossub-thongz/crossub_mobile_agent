import type { BillableInspectionType } from '@/lib/billing/resolve-billing-inspection-id';
import { resolveBillingInspectionId } from '@/lib/billing/resolve-billing-inspection-id';
import {
  ensureAgentInspectionPlatformCharge,
  fetchAgentInspectionPlatformCharge,
  listAgentChargeHistory,
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

async function fetchChargeByIds(candidateIds: string[]): Promise<AgentBillingCharge | null> {
  const tried = new Set<string>();
  for (const raw of candidateIds) {
    const id = raw.trim();
    if (!id || tried.has(id)) continue;
    tried.add(id);
    const linked = await fetchAgentInspectionPlatformCharge(id);
    if (linked) return linked;
  }
  return null;
}

/** Match charges that were quoted without a linked inspection id (legacy staging). */
async function findChargeFromHistory(args: {
  propertyId?: string;
  inspectionType?: BillableInspectionType;
}): Promise<AgentBillingCharge | null> {
  if (!args.propertyId || !args.inspectionType) return null;

  const serviceType = SERVICE_TYPE[args.inspectionType];
  try {
    const history = await listAgentChargeHistory();
    const matches = history.filter(
      (row) => row.propertyId === args.propertyId && row.serviceType === serviceType,
    );
    if (matches.length === 0) return null;

    const paid = matches.find((row) => row.status === 'paid');
    if (paid) return paid;

    return matches.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] ?? null;
  } catch {
    return null;
  }
}

async function createMissingCharge(args: {
  poolInspectionId: string;
  propertyId?: string;
  inspectionType?: BillableInspectionType;
}): Promise<AgentBillingCharge | null> {
  const poolId = args.poolInspectionId.trim();
  if (!poolId) return null;

  try {
    const linked = await ensureAgentInspectionPlatformCharge(poolId);
    if (linked) return linked;
  } catch {
    /* ensure-charge may not exist on older API builds */
  }

  if (args.propertyId && args.inspectionType) {
    try {
      return await quoteAgentBillingCharge({
        serviceType: SERVICE_TYPE[args.inspectionType],
        propertyId: args.propertyId,
        inspectionId: poolId,
      });
    } catch {
      /* quote with inspectionId may not exist on older API builds */
    }
  }

  return null;
}

/** Create a charge if needed, then return it (for manual Pay click). */
export async function prepareInspectionPlatformCharge(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
  poolInspectionId?: string;
}): Promise<{ charge: AgentBillingCharge | null; billingInspectionId: string }> {
  const loaded = await loadInspectionPlatformCharge(args);
  if (loaded.charge?.status === 'paid') return loaded;
  if (loaded.charge?.status === 'awaiting_payment') return loaded;

  const poolId =
    loaded.billingInspectionId.trim() ||
    args.poolInspectionId?.trim() ||
    args.inspectionId.trim();

  const created = await createMissingCharge({
    poolInspectionId: poolId,
    propertyId: args.propertyId,
    inspectionType: args.inspectionType,
  });

  return { charge: created, billingInspectionId: poolId };
}

/** Load the platform charge for an accepted inspection job (read-only — no charge creation). */
export async function loadInspectionPlatformCharge(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
  /** When known, skip session→pool resolution. */
  poolInspectionId?: string;
}): Promise<{ charge: AgentBillingCharge | null; billingInspectionId: string }> {
  // Triggers inspector-accept charge sweep on API builds that support it.
  try {
    await listAgentChargeHistory();
  } catch {
    /* non-fatal */
  }

  let billingInspectionId =
    args.poolInspectionId?.trim() ||
    (await resolveBillingInspectionId({
      inspectionId: args.inspectionId.trim(),
      propertyId: args.propertyId,
      viewingSessionId: args.viewingSessionId,
      inspectionType: args.inspectionType,
    }));

  const candidateIds = [
    billingInspectionId,
    args.inspectionId,
    args.viewingSessionId ?? '',
  ];

  let charge =
    (await fetchChargeByIds(candidateIds)) ??
    (await findChargeFromHistory({
      propertyId: args.propertyId,
      inspectionType: args.inspectionType,
    }));

  if (!charge) {
    const retried = await resolveBillingInspectionId({
      inspectionId: '',
      propertyId: args.propertyId,
      viewingSessionId: args.viewingSessionId,
      inspectionType: args.inspectionType,
    });
    if (retried && retried !== billingInspectionId) {
      billingInspectionId = retried;
      charge =
        (await fetchChargeByIds([retried, ...candidateIds])) ??
        (await findChargeFromHistory({
          propertyId: args.propertyId,
          inspectionType: args.inspectionType,
        }));
    }
  }

  return { charge, billingInspectionId };
}
