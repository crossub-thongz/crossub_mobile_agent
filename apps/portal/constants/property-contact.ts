import type { components } from '@crossub-thongz/api-contract';

type PropertyContactRole = components['schemas']['AgentPropertyContactDto']['role'];

/** `PropertyContact.role` on the agent property contacts routes. */
export const PROPERTY_CONTACT_ROLE = {
  TENANT: 'TENANT',
  LANDLORD: 'LANDLORD',
} as const satisfies Record<string, PropertyContactRole>;
