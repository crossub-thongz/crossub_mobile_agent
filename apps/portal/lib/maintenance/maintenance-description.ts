/**
 * A job's stored description is `"<Issue type>: <body>"` when it was raised with an issue type.
 * The same split the server makes (`splitStaffDescription`), so an edit that sends the body back
 * keeps — or replaces — the prefix exactly as the server reads it.
 */
export function splitAgentMaintenanceDescription(description: string | null | undefined): {
  issueType: string;
  body: string;
} {
  const raw = description?.trim() ?? '';
  const colon = raw.indexOf(':');
  if (colon > 0) {
    return {
      issueType: raw.slice(0, colon).trim(),
      body: raw.slice(colon + 1).trim(),
    };
  }
  return { issueType: '', body: raw };
}
