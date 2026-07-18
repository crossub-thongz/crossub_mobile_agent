/** Shared document slot definitions — no component imports (avoids circular deps). */

export type DocumentSlot = { id: string; label: string };

/** Property Documents tab + wizard — tenancy group (display order). */
export const TENANCY_DOCUMENT_SLOTS: DocumentSlot[] = [
  { id: 'lease_agreement', label: 'Lease Agreement' },
  { id: 'lease_extension', label: 'Lease Extension Agreement' },
  { id: 'paper_bond', label: 'Paper Bond' },
  { id: 'key_handover_form', label: 'Key Handover Form' },
  { id: 'tenancy_ledger', label: 'Tenancy Ledger' },
  { id: 'ingoing_report', label: 'Ingoing Inspection report' },
  { id: 'outgoing_report', label: 'Outgoing Inspection report' },
];

export const MANAGEMENT_AGREEMENT_DOC_SLOT = {
  id: 'management_agreement',
  label: 'Property Management Agreement',
} as const;

/** Property Documents tab + wizard — landlord group (display order). */
export const LANDLORD_DOCUMENT_SLOTS: DocumentSlot[] = [
  MANAGEMENT_AGREEMENT_DOC_SLOT,
  { id: 'property_landlord_insurance', label: 'Landlord Insurance' },
  { id: 'council_rate', label: 'Council Rate' },
  { id: 'strata_levy', label: 'Strata levy' },
  { id: 'water_bill', label: 'Water Bill' },
  { id: 'water_efficiency_certificate', label: 'Water Efficiency Certificate' },
  { id: 'smoke_alarm_compliance', label: 'Smoke alarm Compliance' },
];

/** Wizard tenant-application step / Documents tab. */
export const TENANT_APPLICATION_DOCUMENT_SLOTS: DocumentSlot[] = [
  { id: 'application_form', label: 'Application Form' },
  { id: 'photo_id', label: 'Photo ID' },
  { id: 'bank_statement', label: 'Bank Statement' },
  // Must be unique — previously reused `tenancy_ledger`, which remapped uploads to Tenancy Ledger.
  { id: 'supporting_documents', label: 'Supporting Documents' },
  { id: 'visa', label: 'Visa' },
  { id: 'payslip', label: 'Payslip' },
];

/** @deprecated Legacy exports — prefer TENANCY_DOCUMENT_SLOTS / LANDLORD_DOCUMENT_SLOTS. */
export const LEASING_FIXED_DOC_SLOTS = [
  { id: 'lease_agreement', label: 'Lease Agreement' },
  { id: 'lease_extension', label: 'Lease Extension Agreement' },
  ...TENANT_APPLICATION_DOCUMENT_SLOTS.filter((s) => s.id === 'supporting_documents'),
] as const;

/** @deprecated */
export const PROPERTY_FIXED_DOC_SLOTS = LANDLORD_DOCUMENT_SLOTS.filter(
  (s) => s.id !== 'management_agreement',
) as unknown as readonly DocumentSlot[];

/** @deprecated */
export const OTHER_LEASING_DOCUMENT_OPTIONS = [
  { id: 'paper_bond', label: 'Paper Bond' },
  { id: 'key_handover_form', label: 'Key Handover Form' },
  { id: 'ingoing_report', label: 'Ingoing Inspection report' },
  { id: 'outgoing_report', label: 'Outgoing Inspection report' },
  { id: 'bond_lodgement', label: 'Bond lodgement' },
  { id: 'rent_ledger', label: 'Rent ledger' },
  { id: 'other', label: 'Other' },
] as const;
