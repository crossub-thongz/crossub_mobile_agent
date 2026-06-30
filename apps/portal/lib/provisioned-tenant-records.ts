import type { ProvisionedTenant } from '@/lib/tenant-provisioning';

export interface ProvisionedTenantRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Stored locally so agents can re-share credentials with the tenant. */
  password?: string;
  status: string;
  provisionedAt: string;
  applicationLabel?: string;
  selectionId?: string;
  propertyId?: string;
}

export function buildProvisionedTenantRecord(input: {
  provisioned: ProvisionedTenant;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  applicationLabel?: string;
  selectionId?: string;
  propertyId?: string;
}): ProvisionedTenantRecord {
  const { provisioned } = input;
  return {
    id: provisioned.id,
    email: provisioned.email,
    firstName:
      typeof provisioned.firstName === 'string'
        ? provisioned.firstName
        : input.firstName,
    lastName:
      typeof provisioned.lastName === 'string'
        ? provisioned.lastName
        : input.lastName,
    phone: input.phone,
    password: input.password,
    status: provisioned.status,
    provisionedAt: new Date().toISOString(),
    applicationLabel: input.applicationLabel,
    selectionId: input.selectionId,
    propertyId: input.propertyId,
  };
}
