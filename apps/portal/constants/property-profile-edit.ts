/**
 * Property profile edits ported from staff Properties (Daniel, 20 Oct 2026): core facts, rent
 * settings, tenancy archive / restore / pin, contact removal, tenant login, arrears reminder and
 * the assigned agency agent. Value sets are typed off the contract so a new server value fails
 * the type-check here.
 */

import type { components } from '@crossub-thongz/api-contract';

import type { LeasingRecord } from '@/lib/types';

type Schemas = components['schemas'];

export type PropertyRentPeriod = Schemas['AgentPropertyResponseDto']['rentPeriod'];

export const PROPERTY_RENT_PERIOD = {
  WEEKLY: 'WEEKLY',
  FORTNIGHTLY: 'FORTNIGHTLY',
  MONTHLY: 'MONTHLY',
} as const satisfies Record<string, PropertyRentPeriod>;

export const PROPERTY_RENT_PERIOD_LABEL: Record<PropertyRentPeriod, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

/** The cycles the rent settings dialog offers; yearly stays readable but is not offered. */
export const PROPERTY_RENT_PERIOD_ORDER: readonly PropertyRentPeriod[] = [
  PROPERTY_RENT_PERIOD.WEEKLY,
  PROPERTY_RENT_PERIOD.FORTNIGHTLY,
  PROPERTY_RENT_PERIOD.MONTHLY,
];

/**
 * The app maps a SIGNED or ACTIVE agreement to a `current` leasing record — exactly the
 * agreements the server lets you pin as the current tenancy.
 */
export const PINNABLE_LEASING_RECORD_STATUS = 'current' satisfies LeasingRecord['status'];

/** Mirrors the API limits so the inputs refuse what the server would. */
export const PROPERTY_EDIT_LIMITS = {
  paymentReferenceMax: 60,
  roomsMax: 100,
} as const;

export const PROPERTY_EDIT_COPY = {
  factsTitle: 'Property details',
  editDetails: 'Edit details',
  factsDescription: 'Address and the basics. Changes show everywhere this property appears.',
  address: 'Street address',
  suburb: 'Suburb',
  state: 'State',
  postcode: 'Postcode',
  propertyType: 'Property type',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  parking: 'Parking',
  furnished: 'Furnished',
  factsSaved: 'Property details saved',
  addressRequired: 'Enter the street address and suburb.',
  invalidCount: 'Bedrooms, bathrooms and parking must be whole numbers.',

  rentTitle: 'Rent settings',
  rentDescription:
    'How the tenant pays and how much repair work you can approve without asking the owner.',
  rentPeriod: 'Rent cycle',
  rentPeriodHint: 'Display only. Rent is still stored as a weekly amount.',
  paymentReference: 'Rent payment reference',
  paymentReferenceHint: 'The tenant quotes this on bank transfers. Leave blank to remove it.',
  repairLimit: 'Repair limit (AUD)',
  repairLimitHint: 'Repairs up to this amount need no owner approval. Blank uses the agency default.',
  invalidLimit: 'Enter a repair limit of 0 or more.',
  rentSaved: 'Rent settings saved',
  agencyDefault: 'Agency default',

  save: 'Save',
  cancel: 'Cancel',

  archiveTenant: 'Archive tenant',
  archiveConfirm:
    'Archive this tenancy? The tenant moves to past tenancies and the property is set to Vacant. You can restore it later.',
  archived: 'Tenancy archived',
  restoreTenancy: 'Restore tenancy',
  restoreConfirm: 'Put this tenancy back on the property as the current one?',
  restored: 'Tenancy restored',
  setCurrent: 'Set as current',
  clearPin: 'Use lease dates',
  pinned: 'Current tenancy set',
  pinCleared: 'Current tenancy follows the lease dates again',
  pinnedBadge: 'Pinned',
  tenanciesTitle: 'Tenancy agreements',
  tenanciesHint: 'Pin one when the lease dates pick the wrong tenancy as current.',

  removeContact: 'Remove',
  removeConfirm: (name: string) => `Remove ${name} from this property?`,
  removed: 'Contact removed',
  sendLogin: 'Send app login',
  loginSent: (email: string) => `Tenant app login sent to ${email}`,

  sendReminder: 'Send reminder',
  reminderSent: (count: number) =>
    count === 1 ? 'Arrears reminder sent to the tenant' : `Arrears reminder sent to ${count} tenants`,
  reminderConfirm: 'Email the tenant a reminder about the open arrears?',

  assignedAgent: 'Assigned agent',
  unassigned: 'Unassigned',
  assignTitle: 'Assigned agent',
  assignDescription: 'The agent at your agency who looks after this property.',
  assignSaved: 'Assigned agent saved',
  teamLoadFailed: "Couldn't load your team.",
} as const;
