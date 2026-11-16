/**
 * Add Property (Daniel's spec v1.0, 13 Nov 2026): one page plus an owner drawer. A property is
 * a draft until the agent activates it, and activation needs only an address, a property type
 * and its owners.
 */

/** How long after the last change a draft is saved. */
export const ADD_PROPERTY_AUTOSAVE_MS = 800;

/** Marks the address parts this page keeps in the draft, so an older draft is told apart. */
export const ADD_PROPERTY_DRAFT_VERSION = 2;

/** Saved as the address until the agent has typed a street line; the API reads it as "none yet". */
export const ADD_PROPERTY_PLACEHOLDER_ADDRESS = 'Draft property';

export const PROPERTY_FURNISHING = {
  UNFURNISHED: 'UNFURNISHED',
  PARTLY_FURNISHED: 'PARTLY_FURNISHED',
  FULLY_FURNISHED: 'FULLY_FURNISHED',
} as const;

export type PropertyFurnishing = (typeof PROPERTY_FURNISHING)[keyof typeof PROPERTY_FURNISHING];

export const PROPERTY_FURNISHING_ORDER: readonly PropertyFurnishing[] = [
  PROPERTY_FURNISHING.UNFURNISHED,
  PROPERTY_FURNISHING.PARTLY_FURNISHED,
  PROPERTY_FURNISHING.FULLY_FURNISHED,
];

export const PROPERTY_FURNISHING_LABEL: Record<PropertyFurnishing, string> = {
  [PROPERTY_FURNISHING.UNFURNISHED]: 'Unfurnished',
  [PROPERTY_FURNISHING.PARTLY_FURNISHED]: 'Partly furnished',
  [PROPERTY_FURNISHING.FULLY_FURNISHED]: 'Fully furnished',
};

export const PROPERTY_FEATURE = {
  AIR_CONDITIONING: 'AIR_CONDITIONING',
  BALCONY: 'BALCONY',
  DISHWASHER: 'DISHWASHER',
  BUILT_IN_WARDROBES: 'BUILT_IN_WARDROBES',
  SECURE_PARKING: 'SECURE_PARKING',
  STORAGE_CAGE: 'STORAGE_CAGE',
  GYM: 'GYM',
  SWIMMING_POOL: 'SWIMMING_POOL',
} as const;

export type PropertyFeature = (typeof PROPERTY_FEATURE)[keyof typeof PROPERTY_FEATURE];

export const PROPERTY_FEATURE_ORDER: readonly PropertyFeature[] = Object.values(PROPERTY_FEATURE);

export const PROPERTY_FEATURE_LABEL: Record<PropertyFeature, string> = {
  [PROPERTY_FEATURE.AIR_CONDITIONING]: 'Air conditioning',
  [PROPERTY_FEATURE.BALCONY]: 'Balcony',
  [PROPERTY_FEATURE.DISHWASHER]: 'Dishwasher',
  [PROPERTY_FEATURE.BUILT_IN_WARDROBES]: 'Built-in wardrobes',
  [PROPERTY_FEATURE.SECURE_PARKING]: 'Secure parking',
  [PROPERTY_FEATURE.STORAGE_CAGE]: 'Storage cage',
  [PROPERTY_FEATURE.GYM]: 'Gym',
  [PROPERTY_FEATURE.SWIMMING_POOL]: 'Swimming pool',
};

export const PROPERTY_OCCUPANCY = {
  VACANT: 'vacant',
  TENANTED: 'tenanted',
} as const;

export type PropertyOccupancy = (typeof PROPERTY_OCCUPANCY)[keyof typeof PROPERTY_OCCUPANCY];

export const OWNER_KIND = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const;

export type OwnerKind = (typeof OWNER_KIND)[keyof typeof OWNER_KIND];

export const OWNER_DRAWER_TAB = {
  EXISTING: 'existing',
  NEW: 'new',
} as const;

export type OwnerDrawerTab = (typeof OWNER_DRAWER_TAB)[keyof typeof OWNER_DRAWER_TAB];

/** Shares are entered to two decimals and must total this. */
export const OWNERSHIP_TOTAL_PERCENT = 100;
export const OWNERSHIP_TOTAL_TOLERANCE = 0.005;
export const OWNER_PHONE_MIN_DIGITS = 6;
export const OWNER_SEARCH_MIN_LENGTH = 2;
export const OWNER_SEARCH_PAGE_SIZE = 8;
export const OWNER_SEARCH_DEBOUNCE_MS = 300;

/** Upper bounds matching the API's, so a typo is caught on the form. */
export const PROPERTY_DETAIL_LIMIT = {
  ROOM_COUNT_MAX: 100,
  AREA_SQM_MAX: 9_999_999,
  STORAGE_SPACES_MAX: 100,
  FLOOR_LEVEL_MAX_LENGTH: 40,
} as const;

export const AU_POSTCODE_LENGTH = 4;

/** The API's 422 `code` when activation or Save Owners fails a rule. */
export const PROPERTY_INTAKE_FAILURE_CODE = {
  OWNERS_INVALID: 'PROPERTY_OWNERS_INVALID',
  ACTIVATION_FAILED: 'PROPERTY_ACTIVATION_FAILED',
} as const;

export const ADD_PROPERTY_SAVE_STATE = {
  IDLE: 'idle',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
} as const;

export type AddPropertySaveState =
  (typeof ADD_PROPERTY_SAVE_STATE)[keyof typeof ADD_PROPERTY_SAVE_STATE];

/** The form field an activation error points at, so the page can scroll to it. */
export const ADD_PROPERTY_FIELD = {
  STREET_NUMBER: 'streetNumber',
  STREET_NAME: 'streetName',
  SUBURB: 'suburb',
  STATE: 'state',
  POSTCODE: 'postcode',
  PROPERTY_TYPE: 'propertyType',
  DETAILS: 'details',
  OWNERS: 'owners',
} as const;

export type AddPropertyField = (typeof ADD_PROPERTY_FIELD)[keyof typeof ADD_PROPERTY_FIELD];

/** Where each API error field lands on the form. */
export const ADD_PROPERTY_API_FIELD: Record<string, AddPropertyField> = {
  address: ADD_PROPERTY_FIELD.STREET_NAME,
  suburb: ADD_PROPERTY_FIELD.SUBURB,
  state: ADD_PROPERTY_FIELD.STATE,
  postcode: ADD_PROPERTY_FIELD.POSTCODE,
  owners: ADD_PROPERTY_FIELD.OWNERS,
};

/** Opens Add tenancy on the property's Tenancies section (Self-Manage). */
export const ADD_TENANCY_QUERY_PARAM = 'addTenancy';
export const ADD_TENANCY_QUERY_VALUE = '1';

export const ADD_PROPERTY_COPY = {
  TITLE: 'Add Property',
  RESUME_TITLE: 'Resume property',
  INTRO:
    'Register a property and link its owner. Tenancy and other details are completed separately.',
  ADDRESS_HEADING: 'Property Address',
  ESSENTIAL_HEADING: 'Essential Details',
  ADDITIONAL_HEADING: 'Additional Details',
  FEATURES_HEADING: 'Features & Amenities',
  OCCUPANCY_HEADING: 'Occupancy',
  OWNERS_HEADING: 'Property Owners',
  REQUIRED: 'Required',
  OPTIONAL: 'Optional',
  UNKNOWN_PLACEHOLDER: 'Not known',
  LOCATION_UNVERIFIED: 'Address edited. Pick it from the search again to place it on the map.',
  LOCATION_MATCHED: 'Address placed on the map',
  LOCATION_NONE: 'Pick a search result to place the address on the map',
  VACANT: 'Vacant',
  TENANTED: 'Tenanted',
  UPCOMING: 'Upcoming tenancy arranged',
  NO_OWNER: 'No owner linked. At least one owner is needed to activate.',
  OWNERS_UNSAVED: 'These owners came from an earlier draft and are not saved yet. Open Manage Owners and save.',
  LINK_OWNER: 'Link Owner',
  MANAGE_OWNERS: 'Manage Owners',
  PRIMARY: 'Primary',
  SAVE_DRAFT: 'Save Draft',
  ACTIVATE: 'Activate Property',
  ACTIVATING: 'Activating…',
  DRAFT_BADGE: 'Draft',
  NOT_SAVED: 'Not saved yet',
  SAVING: 'Saving…',
  SAVED: 'Draft saved',
  SAVE_FAILED: 'Save failed. Your changes are still on this page.',
  SAVE_RETRY: 'Try again',
  NOTHING_TO_SAVE: 'Enter an address or link an owner first',
  DRAFT_SAVED_TOAST: 'Draft saved',
  ACTIVATION_ERRORS_HEADING: 'Fix these before activating',
  DUPLICATE_HEADING: 'This property is already registered',
  DUPLICATE_BODY: 'This address is already registered for this agency.',
  DUPLICATE_OPEN: 'Open existing property',
  LOADING_DRAFT: 'Loading saved property…',
  LOADING_AGENCY: 'Loading your agency profile…',
  NO_AGENCY:
    'Your agency profile is not set up yet. Complete registration before adding properties.',
  ALREADY_REGISTERED: 'This property is already registered',
  DRAFT_LOAD_FAILED: 'Could not load property draft',
  ACTIVATE_FAILED: 'Could not activate the property',
} as const;

export const OWNER_DRAWER_COPY = {
  TITLE: 'Property Owners',
  SUBTITLE: 'Search, create and manage ownership',
  TAB_EXISTING: 'Existing Owner',
  TAB_NEW: 'Create New',
  SEARCH_LABEL: 'Search existing owner',
  SEARCH_PLACEHOLDER: 'Name, email or phone',
  SEARCH_HINT: 'Type at least 2 characters',
  SEARCHING: 'Searching…',
  SEARCH_FAILED: 'Could not search owners',
  NO_MATCH: 'No matching owner. Use Create New.',
  ADD: 'Add',
  LINKED: 'Linked',
  OWNER_TYPE: 'Owner type',
  INDIVIDUAL: 'Individual',
  COMPANY: 'Company',
  FIRST_NAME: 'First name',
  MIDDLE_NAME: 'Middle name',
  LAST_NAME: 'Last name',
  COMPANY_NAME: 'Legal company name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  NEW_HINT: 'Legal name and an email or a phone are required.',
  CREATE: 'Create & Add Owner',
  LINKED_HEADING: 'Linked Owners',
  PRIMARY_HINT: 'Choose exactly one primary contact.',
  PRIMARY_CONTACT: 'Primary contact',
  NONE_SELECTED: 'No owners selected.',
  PERCENT_TOGGLE: 'Specify ownership percentages',
  PERCENT_HINT: 'Optional. When on, every owner needs a share and they must total 100%.',
  PERCENT_TOTAL: 'Ownership total',
  CANCEL: 'Cancel',
  SAVE: 'Save Owners',
  SAVING: 'Saving…',
  SAVED: 'Owners saved',
  SAVE_FAILED: 'Could not save the owners',
  REMOVE: 'Remove owner',
  CLOSE: 'Close',
} as const;

export const OWNER_ERROR = {
  NAME_REQUIRED: 'Enter the complete legal name.',
  CONTACT_REQUIRED: 'An email or a phone is required.',
  EMAIL_INVALID: 'That email does not look right.',
  PHONE_INVALID: 'That phone number is too short.',
  DUPLICATE: 'This owner is already linked.',
  NONE: 'Link at least one owner.',
  PRIMARY: 'Choose a primary contact.',
  PERCENT_INCOMPLETE: 'Enter a percentage between 0 and 100 for every owner.',
  PERCENT_TOTAL: 'Ownership must total 100%.',
} as const;

export const ACTIVATION_ERROR = {
  STREET_NUMBER: 'Street number is required',
  STREET_NAME: 'Street name is required',
  SUBURB: 'Suburb is required',
  STATE: 'State or territory is required',
  POSTCODE: 'A 4-digit postcode is required',
  PROPERTY_TYPE: 'Property type is required',
  OWNERS: 'Link at least one owner',
  OWNERS_UNSAVED: 'Save the owners in Manage Owners first',
  PRIMARY: 'Choose one primary contact for the owners',
  BEDROOMS: 'Bedrooms must be a whole number',
  BATHROOMS: 'Bathrooms must be a whole number',
  PARKING: 'Parking must be a whole number',
  STORAGE: 'Storage spaces must be a whole number',
  INTERNAL_AREA: 'Internal area must be a number',
  LAND_AREA: 'Land area must be a number',
} as const;

export const ACTIVATION_SUCCESS_COPY = {
  HEADING: 'Property Activated',
  ACTIVE_BADGE: 'Active',
  NEXT_HEADING: 'Recommended next step',
  NEXT_TENANCY_SELF_MANAGED: 'Add the tenancy for this property. The property is already selected.',
  NEXT_TENANCY_SERVICED:
    'Record the tenancy details on the property page so CROSSUB has them.',
  NEXT_VACANT: 'The property is vacant, so no tenancy is needed yet.',
  ADD_TENANCY: 'Add Tenancy',
  ADD_TENANCY_DETAILS: 'Add tenancy details',
  VIEW_PROPERTY: 'View Property',
  PROPERTIES: 'Properties',
  ADD_ANOTHER: 'Add Another Property',
} as const;
