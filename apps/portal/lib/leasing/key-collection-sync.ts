import type { AgentKeyCollection } from '@/lib/crossub-api/agent-client';
import {
  LEASING_ITEM_STATUS,
  LEASING_KEY_CUSTODY,
  type LeasingItemStatus,
  type LeasingKeyCustody,
} from '@/lib/leasing/constants';

export function mapApiKeyCollectionStatus(status: string | null | undefined): LeasingItemStatus {
  const values = Object.values(LEASING_ITEM_STATUS) as string[];
  if (status && values.includes(status)) return status as LeasingItemStatus;
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

export function mapApiKeyCustody(custody: string | null | undefined): LeasingKeyCustody {
  return custody === LEASING_KEY_CUSTODY.CROSSUB
    ? LEASING_KEY_CUSTODY.CROSSUB
    : LEASING_KEY_CUSTODY.AGENT;
}

/** Normalise the agent key-collection API block onto the leasing workflow store shape. */
export function keyCollectionFromApi(kc: AgentKeyCollection): {
  status: LeasingItemStatus;
  custody: LeasingKeyCustody;
  time?: string;
  location?: string;
} {
  return {
    status: mapApiKeyCollectionStatus(kc.status),
    custody: mapApiKeyCustody(kc.custody),
    time: kc.time ?? undefined,
    location: kc.location ?? undefined,
  };
}
