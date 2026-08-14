/**
 * Party labels stamped on the workflow email contact chips.
 *
 * These are display labels, not API values — the API stores a kind (`landlord_research_email`)
 * and a free-text `to`; the portal decorates both with a role for the reader. They live here
 * because two things have to keep agreeing about them: `buildPropertyWorkflowEmailContacts`,
 * which stamps a role onto every contact it collects, and the recipient filters that read
 * those roles back to decide which chips a given dialog may offer. A rename on one side only
 * would empty a picker rather than fail loudly, and the portal has no test suite to catch it.
 */
export const WORKFLOW_EMAIL_ROLE = {
  AGENT: 'Agent',
  LANDLORD: 'Landlord',
  TENANT: 'Tenant',
  STRATA: 'Strata',
} as const;

export type WorkflowEmailRole = (typeof WORKFLOW_EMAIL_ROLE)[keyof typeof WORKFLOW_EMAIL_ROLE];

/**
 * A property with co-owners or co-tenants numbers the extra rows — `Landlord 2`, `Tenant 3` —
 * so a role match has to compare the leading word, never the whole label.
 */
export function workflowEmailRoleMatches(role: string, expected: WorkflowEmailRole): boolean {
  const leading = role.trim().split(/\s+/)[0]?.toLowerCase();
  return leading === expected.toLowerCase();
}
