const PRESERVED_TOKENS = new Set([
  'CROS',
  'GST',
  'YTD',
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'NT',
  'ACT',
  'AUD',
]);

function capitalizeWord(word: string): string {
  const upper = word.toUpperCase();
  if (PRESERVED_TOKENS.has(upper)) return upper;
  if (/^[A-Z0-9]{2,}$/.test(word)) return word;
  const lower = word.toLowerCase();
  if (!lower) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Title-case user-facing labels while preserving acronyms (CROS, GST, YTD, …). */
export function formatTitleCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/(\s+|·|—|–|-|\/)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /^[·—–\-/]$/.test(part)) return part;
      return capitalizeWord(part);
    })
    .join('');
}

/** Format enum / API status strings (`routine_inspection` → `Routine Inspection`). */
export function formatEnumLabel(text: string): string {
  return formatTitleCase(text.replace(/_/g, ' '));
}
