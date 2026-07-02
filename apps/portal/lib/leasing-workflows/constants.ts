/** Workflow stages from Leasing ops PDFs — shared across Agent portal screens. */

export const NEW_LEASING_STAGES = [
  { id: 'inspection_confirmation', label: 'Inspection confirmation' },
  { id: 'application_chasing', label: 'Application chasing' },
  { id: 'inspection_report', label: 'Inspection report' },
  { id: 'application_submission', label: 'Application submission' },
  { id: 'application_analysis', label: 'Application analysis' },
  { id: 'reference_check', label: 'Reference check' },
  { id: 'agent_approval_request', label: 'Agent approval request' },
  { id: 'agent_decision', label: 'Agent decision' },
  { id: 'deposit_collection', label: 'Deposit collection' },
  { id: 'lease_preparation', label: 'Lease preparation' },
  { id: 'lease_signature', label: 'Lease signature' },
  { id: 'welcome_package', label: 'Welcome package' },
  { id: 'key_handover', label: 'Key handover' },
] as const;

export const PROPERTY_TRANSFER_IN_STAGES = [
  { id: 'property_setup', label: 'Property setup' },
  { id: 'document_request', label: 'Document request' },
  { id: 'document_upload', label: 'Document upload' },
  { id: 'tenant_notification', label: 'Tenant notification' },
  { id: 'rent_redirection', label: 'Rent redirection' },
  { id: 'transfer_complete', label: 'Transfer complete' },
] as const;

export const PROPERTY_TRANSFER_OUT_STAGES = [
  { id: 'handover_notice', label: 'Handover notice' },
  { id: 'tenant_notification', label: 'Tenant notification' },
  { id: 'final_rent_collection', label: 'Final rent collection' },
  { id: 'document_compilation', label: 'Document compilation' },
  { id: 'key_handover', label: 'Key handover' },
  { id: 'rbo_notification', label: 'RBO notification' },
  { id: 'transfer_complete', label: 'Transfer complete' },
] as const;

export const LEASE_RENEWAL_STAGES = [
  { id: 'auto_trigger', label: 'Auto-trigger rent review' },
  { id: 'rental_research', label: 'Rental research' },
  { id: 'agent_approval', label: 'Agent approval' },
  { id: 'notice_issue', label: 'Notice issue' },
  { id: 'tenant_confirmation', label: 'Tenant confirmation' },
  { id: 'lease_renewal_prep', label: 'Lease renewal agreement' },
  { id: 'lease_signature', label: 'Lease signature & completion' },
] as const;

export type DocumentChecklistId =
  | 'management_agreement'
  | 'landlord_id'
  | 'insurance_certificate'
  | 'tenancy_agreement'
  | 'rent_ledger'
  | 'ingoing_inspection'
  | 'outgoing_inspection'
  | 'bond_lodgement'
  | 'keys_inventory'
  | 'utilities'
  | 'strata_levy'
  | 'council_rates'
  | 'water_bill'
  | 'rbo_change_agent'
  | 'compliance_smoke'
  | 'compliance_electrical'
  | 'compliance_gas'
  | 'listing_photos'
  | 'application_documents'
  | 'other';

export interface DocumentChecklistItem {
  id: DocumentChecklistId;
  label: string;
  required: boolean;
  /** Hint for PMS package auto-match */
  filePatterns: RegExp[];
}

export const TRANSFER_IN_DOCUMENT_CHECKLIST: DocumentChecklistItem[] = [
  {
    id: 'management_agreement',
    label: 'Management agreement / authority to let',
    required: true,
    filePatterns: [/management/i, /authority/i, /agreement/i],
  },
  {
    id: 'insurance_certificate',
    label: 'Landlord insurance certificate',
    required: true,
    filePatterns: [/insurance/i, /terri.?scheer/i, /certificate/i],
  },
  {
    id: 'tenancy_agreement',
    label: 'Current tenancy agreement',
    required: true,
    filePatterns: [/lease/i, /tenancy/i, /agreement/i],
  },
  {
    id: 'rent_ledger',
    label: 'Rent ledger',
    required: true,
    filePatterns: [/ledger/i, /rent.?history/i],
  },
  {
    id: 'ingoing_inspection',
    label: 'Ingoing / condition inspection report',
    required: true,
    filePatterns: [/ingoing/i, /condition/i, /entry/i, /inspection/i],
  },
  {
    id: 'bond_lodgement',
    label: 'Bond lodgement (RBO)',
    required: true,
    filePatterns: [/bond/i, /rbo/i, /lodgement/i],
  },
  {
    id: 'keys_inventory',
    label: 'Keys inventory',
    required: true,
    filePatterns: [/key/i],
  },
  {
    id: 'utilities',
    label: 'Utilities information',
    required: false,
    filePatterns: [/utilit/i, /electric/i, /gas/i, /water/i],
  },
  {
    id: 'strata_levy',
    label: 'Strata levy notices',
    required: false,
    filePatterns: [/strata/i, /levy/i],
  },
  {
    id: 'compliance_smoke',
    label: 'Smoke alarm compliance',
    required: false,
    filePatterns: [/smoke/i],
  },
];

export const TRANSFER_OUT_DOCUMENT_CHECKLIST: DocumentChecklistItem[] = [
  ...TRANSFER_IN_DOCUMENT_CHECKLIST,
  {
    id: 'outgoing_inspection',
    label: 'Outgoing inspection report',
    required: true,
    filePatterns: [/outgoing/i, /exit/i],
  },
  {
    id: 'council_rates',
    label: 'Council rates',
    required: false,
    filePatterns: [/council/i, /rates/i],
  },
  {
    id: 'water_bill',
    label: 'Water bill',
    required: false,
    filePatterns: [/water/i],
  },
  {
    id: 'rbo_change_agent',
    label: 'RBO change of managing agent form',
    required: true,
    filePatterns: [/rbo/i, /change.?agent/i, /fair.?trading/i],
  },
];

export const NEW_PROPERTY_DOCUMENT_CHECKLIST: DocumentChecklistItem[] = [
  {
    id: 'listing_photos',
    label: 'Listing photos',
    required: true,
    filePatterns: [/photo/i, /\.jpe?g$/i, /\.png$/i, /\.webp$/i],
  },
  {
    id: 'management_agreement',
    label: 'Management agreement',
    required: true,
    filePatterns: [/management/i, /authority/i],
  },
  {
    id: 'compliance_smoke',
    label: 'Smoke alarm certificate',
    required: true,
    filePatterns: [/smoke/i],
  },
  {
    id: 'compliance_electrical',
    label: 'Electrical safety certificate',
    required: false,
    filePatterns: [/electrical/i],
  },
  {
    id: 'compliance_gas',
    label: 'Gas compliance certificate',
    required: false,
    filePatterns: [/gas/i],
  },
  {
    id: 'landlord_id',
    label: 'Landlord ID',
    required: false,
    filePatterns: [/landlord/i, /owner/i, /id/i],
  },
  {
    id: 'insurance_certificate',
    label: 'Insurance certificate',
    required: false,
    filePatterns: [/insurance/i],
  },
];

/** Lease renewal terms that must inherit from the original agreement (LEASE RENEWAL.pdf). */
export const INHERITED_LEASE_TERM_FIELDS = [
  { key: 'waterUsage', label: 'Water usage responsibility' },
  { key: 'petsAllowed', label: 'Pets allowed' },
  { key: 'electricityTenant', label: 'Electricity (tenant pays)' },
  { key: 'gasTenant', label: 'Gas (tenant pays)' },
  { key: 'furnished', label: 'Furnished status' },
  { key: 'strataByLaws', label: 'Strata by-laws apply' },
  { key: 'smokeAlarmType', label: 'Smoke alarm type' },
  { key: 'parkingSpaces', label: 'Parking spaces' },
  { key: 'storageLocation', label: 'Storage cage / locker' },
  { key: 'maxOccupants', label: 'Maximum occupants' },
] as const;
