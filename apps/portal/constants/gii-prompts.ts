/** Suggested prompts when Gii is scoped to a property — Property Manager mode. */
export const PROPERTY_GII_PROMPTS = [
  {
    id: 'maintenance',
    label: 'Log maintenance',
    prompt: 'Create a maintenance job for this property.',
  },
  {
    id: 'inspection',
    label: 'Schedule inspection',
    prompt: 'Schedule an inspection for this property.',
  },
  {
    id: 'leasing',
    label: 'Start leasing',
    prompt: 'Start a new leasing cycle for this property.',
  },
  {
    id: 'status',
    label: 'Property status',
    prompt: 'Give me a quick status update on this property.',
  },
] as const;

/** Suggested prompts on the properties phone book — portfolio level. */
export const PORTFOLIO_GII_PROMPTS = [
  {
    id: 'add-property',
    label: 'Add property',
    prompt: 'Help me add a new property to my portfolio.',
  },
  {
    id: 'priorities',
    label: 'What needs action?',
    prompt: 'What properties need my attention today?',
  },
] as const;
