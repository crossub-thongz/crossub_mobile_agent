/**
 * Whether a contractor's listed trades fit this job. Auto-invite uses a positive match only:
 * an untagged contractor, or one whose trades do not overlap the issue, stays unticked.
 */

const STOP_WORDS = new Set([
  'and',
  'the',
  'repair',
  'repairs',
  'service',
  'services',
  'issue',
  'maintenance',
  'fixing',
  'replacement',
  'installation',
  'system',
  'general',
  'removal',
  'control',
  'damages',
  'damage',
]);

/** Short trade words that would otherwise be dropped by the length filter. */
const SHORT_TOKENS = new Set(['ac']);

/**
 * Tokens in the same group count as the same trade. A token belongs to at most one group.
 * "water" sits with plumbing so a hot-water job can match a plumber; pest and air conditioning
 * stay in separate groups.
 */
const TRADE_GROUPS: readonly (readonly string[])[] = [
  ['conditioning', 'aircon', 'hvac', 'ac', 'cooling', 'refrigeration'],
  ['pest', 'termite', 'fumigation'],
  ['plumb', 'plumbing', 'plumber', 'tap', 'toilet', 'shower', 'water', 'hotwater'],
  ['electric', 'electrical', 'electrician'],
  ['lock', 'locksmith'],
  ['clean', 'cleaning', 'mould', 'mold'],
  ['garden', 'gardening', 'gutter', 'guttering', 'tree', 'stump'],
  ['paint', 'painting', 'decorating'],
  ['roof', 'roofing'],
  ['appliance', 'washing', 'dryer'],
  ['blind', 'blinds', 'window'],
  ['tile', 'tiling'],
  ['gyprock', 'plaster', 'plasterboard'],
  ['cabinet', 'joinery'],
  ['carpet', 'timber', 'flooring'],
  ['flood', 'flooding'],
  ['rubbish'],
  ['handyman'],
  ['door'],
];

const ALIAS_OF = new Map<string, string>();
for (const group of TRADE_GROUPS) {
  const canonical = group[0]!;
  for (const token of group) ALIAS_OF.set(token, canonical);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tradeKeys(value: string): Set<string> {
  const keys = new Set<string>();
  for (const token of normalize(value).split(' ')) {
    if (!token || STOP_WORDS.has(token)) continue;
    if (token.length < 4 && !SHORT_TOKENS.has(token)) continue;
    keys.add(ALIAS_OF.get(token) ?? token);
  }
  return keys;
}

export function contractorMatchesIssue(
  serviceTypes: readonly string[] | undefined,
  issueType: string | null | undefined,
): boolean {
  const issue = issueType?.trim() ?? '';
  if (!issue || !serviceTypes?.length) return false;
  const wanted = tradeKeys(issue);
  if (wanted.size === 0) return false;
  return serviceTypes.some((service) => {
    const offered = tradeKeys(service);
    for (const key of offered) {
      if (wanted.has(key)) return true;
    }
    return false;
  });
}
