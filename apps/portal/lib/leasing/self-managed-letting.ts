import { NEGOTIATION_PARTY } from '@/constants/self-managed-leasing';
import type {
  AddNegotiationRoundInput,
  UpdateLettingContractInput,
} from '@/lib/crossub-api/agent-workflow-client';
import type {
  ServerLeasingCycleView,
  ServerLeasingNegotiation,
  ServerLeasingNegotiationRound,
} from '@/lib/leasing-cycle-types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import type { LeasingContract } from '@/lib/leasing/types';

/**
 * Self-Manage letting writes return `{ id }` only: run the facade write, then re-read the cycle
 * so the store gets the new state.
 */
export async function runThenReadCycle(
  cycleId: string,
  action: (cycleId: string) => Promise<unknown>,
): Promise<ServerLeasingCycleView> {
  await action(cycleId);
  return leasingOpsApi.get(cycleId);
}

/** One requested item per non-empty line. */
export function parseRequestedItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export type NegotiationProposalForm = {
  weeklyRent: string;
  leaseTerm: string;
  startDate: string;
  note: string;
};

export const EMPTY_NEGOTIATION_PROPOSAL: NegotiationProposalForm = {
  weeklyRent: '',
  leaseTerm: '',
  startDate: '',
  note: '',
};

function parsePositiveAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`"${trimmed}" is not a valid amount`);
  }
  return amount;
}

/** The agent's proposal body, or null when no term is set (the server 400s an empty round). */
export function buildAgentNegotiationProposal(
  form: NegotiationProposalForm,
): AddNegotiationRoundInput | null {
  const weeklyRent = parsePositiveAmount(form.weeklyRent);
  const leaseTerm = form.leaseTerm.trim() || undefined;
  const startDate = form.startDate.trim() || undefined;
  if (weeklyRent === undefined && !leaseTerm && !startDate) return null;
  return {
    proposedBy: NEGOTIATION_PARTY.AGENT,
    weeklyRent,
    leaseTerm,
    startDate,
    note: form.note.trim() || undefined,
  };
}

function findRound(
  negotiation: ServerLeasingNegotiation | undefined,
  roundId: string | null | undefined,
): ServerLeasingNegotiationRound | null {
  if (!negotiation || !roundId) return null;
  return negotiation.rounds.find((round) => round.id === roundId) ?? null;
}

/** The round on the table, or null. */
export function liveNegotiationRound(
  negotiation: ServerLeasingNegotiation | undefined,
): ServerLeasingNegotiationRound | null {
  return findRound(negotiation, negotiation?.liveRoundId);
}

/** The round that settled the terms, or null. */
export function acceptedNegotiationRound(
  negotiation: ServerLeasingNegotiation | undefined,
): ServerLeasingNegotiationRound | null {
  return findRound(negotiation, negotiation?.acceptedRoundId);
}

/** Prefill a counter from the round on the table. */
export function proposalFormFromRound(
  round: ServerLeasingNegotiationRound | null,
): NegotiationProposalForm {
  if (!round) return EMPTY_NEGOTIATION_PROPOSAL;
  return {
    weeklyRent: round.weeklyRent != null ? String(round.weeklyRent) : '',
    leaseTerm: round.leaseTerm ?? '',
    startDate: round.startDate ? round.startDate.slice(0, 10) : '',
    note: '',
  };
}

export type ContractBasicsForm = {
  leaseTerm: string;
  startDate: string;
  weeklyRent: string;
};

export function contractBasicsFormFrom(contract: LeasingContract): ContractBasicsForm {
  return {
    leaseTerm: contract.leaseTerm ?? '',
    startDate: contract.startDate ? contract.startDate.slice(0, 10) : '',
    weeklyRent: contract.weeklyRent != null ? String(contract.weeklyRent) : '',
  };
}

/** Only the terms that changed, or null when nothing did. */
export function buildContractBasicsPatch(
  form: ContractBasicsForm,
  contract: LeasingContract,
): UpdateLettingContractInput | null {
  const current = contractBasicsFormFrom(contract);
  const patch: UpdateLettingContractInput = {};
  const leaseTerm = form.leaseTerm.trim();
  if (leaseTerm && leaseTerm !== current.leaseTerm) patch.leaseTerm = leaseTerm;
  const startDate = form.startDate.trim();
  if (startDate && startDate !== current.startDate) patch.startDate = startDate;
  const weeklyRent = parsePositiveAmount(form.weeklyRent);
  if (weeklyRent !== undefined && weeklyRent !== contract.weeklyRent) {
    patch.weeklyRent = weeklyRent;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
