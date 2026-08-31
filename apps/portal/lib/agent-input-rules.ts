/**
 * Agent App text-field rules: emoji, line breaks, max length, and no HTML.
 *
 * Unclassified fields still strip HTML. Emoji stripping for those is decided
 * by the v2 default in the input filter, not here.
 */

export const AGENT_INPUT_KIND = {
  PERSON_NAME: 'person_name',
  PROPERTY_ADDRESS: 'property_address',
  EMAIL_SUBJECT: 'email_subject',
  MESSAGE: 'message',
  MAINTENANCE_DESCRIPTION: 'maintenance_description',
  INTERNAL_NOTE: 'internal_note',
  INSPECTION_COMMENT: 'inspection_comment',
  CONTRACTOR_QUOTE_NOTE: 'contractor_quote_note',
  AI_INSTRUCTION: 'ai_instruction',
} as const;

export type AgentInputKind = (typeof AGENT_INPUT_KIND)[keyof typeof AGENT_INPUT_KIND];

export const AGENT_INPUT_KIND_ATTR = 'data-input-kind';

type AgentInputRule = {
  maxLength: number;
  allowLineBreaks: boolean;
  /** Address is “not recommended”; every other listed kind allows emoji. */
  allowEmoji: boolean;
};

export const AGENT_INPUT_RULES: Record<AgentInputKind, AgentInputRule> = {
  person_name: { maxLength: 100, allowLineBreaks: false, allowEmoji: true },
  property_address: { maxLength: 255, allowLineBreaks: false, allowEmoji: false },
  email_subject: { maxLength: 200, allowLineBreaks: false, allowEmoji: true },
  message: { maxLength: 5_000, allowLineBreaks: true, allowEmoji: true },
  maintenance_description: { maxLength: 10_000, allowLineBreaks: true, allowEmoji: true },
  internal_note: { maxLength: 10_000, allowLineBreaks: true, allowEmoji: true },
  inspection_comment: { maxLength: 5_000, allowLineBreaks: true, allowEmoji: true },
  contractor_quote_note: { maxLength: 5_000, allowLineBreaks: true, allowEmoji: true },
  /** Spec is 10,000+; cap so a paste cannot unbounded-grow. */
  ai_instruction: { maxLength: 20_000, allowLineBreaks: true, allowEmoji: true },
};

const KIND_VALUES = new Set<string>(Object.values(AGENT_INPUT_KIND));

export function parseAgentInputKind(value: string | undefined): AgentInputKind | undefined {
  if (!value) return undefined;
  return KIND_VALUES.has(value) ? (value as AgentInputKind) : undefined;
}

function htmlTagOrCommentPattern(): RegExp {
  return /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;
}

export function stripHtmlTags(value: string): string {
  if (!value) return value;
  return value.replace(htmlTagOrCommentPattern(), '');
}

export function containsHtmlTags(value: string): boolean {
  return htmlTagOrCommentPattern().test(value);
}

function codePointLength(value: string): number {
  return [...value].length;
}

function truncateCodePoints(value: string, maxLength: number): string {
  if (codePointLength(value) <= maxLength) return value;
  return [...value].slice(0, maxLength).join('');
}

export function agentInputRequirementText(kind: AgentInputKind): string {
  const rule = AGENT_INPUT_RULES[kind];
  const parts = [`Max ${rule.maxLength.toLocaleString()} characters`, 'no HTML'];
  if (!rule.allowLineBreaks) parts.push('one line');
  if (!rule.allowEmoji) parts.push('no emoji');
  return parts.join(' · ');
}

export function agentInputViolationMessages(
  raw: string,
  options: {
    kind?: AgentInputKind | null;
    allowHtml?: boolean;
    allowEmoji?: boolean;
    stripEmojis?: (value: string) => string;
  } = {},
): string[] {
  const messages: string[] = [];
  const rule = options.kind ? AGENT_INPUT_RULES[options.kind] : undefined;
  if (!options.allowHtml && containsHtmlTags(raw)) {
    messages.push('HTML is not allowed');
  }
  if (rule && !rule.allowLineBreaks && /[\r\n]/.test(raw)) {
    messages.push('Line breaks are not allowed — use one line');
  }
  if (options.allowEmoji === false && options.stripEmojis && options.stripEmojis(raw) !== raw) {
    messages.push('Emoji is not allowed');
  }
  if (rule && codePointLength(raw) > rule.maxLength) {
    messages.push(`Maximum ${rule.maxLength.toLocaleString()} characters`);
  }
  return messages;
}

export function agentInputValueLength(value: string): number {
  return codePointLength(value);
}

export function sanitizeAgentInput(
  value: string,
  options: {
    kind?: AgentInputKind | null;
    allowEmoji?: boolean;
    allowHtml?: boolean;
    stripEmojis?: (value: string) => string;
  } = {},
): string {
  let next = options.allowHtml ? value : stripHtmlTags(value);
  const rule = options.kind ? AGENT_INPUT_RULES[options.kind] : undefined;
  const allowEmoji = options.allowEmoji ?? rule?.allowEmoji ?? true;
  if (!allowEmoji && options.stripEmojis) {
    next = options.stripEmojis(next);
  }
  if (rule && !rule.allowLineBreaks) {
    next = next.replace(/[\r\n]+/g, ' ').replace(/[ \t]{2,}/g, ' ');
  }
  if (rule) {
    next = truncateCodePoints(next, rule.maxLength);
  }
  return next;
}

export function agentInputDatasetProps(kind: AgentInputKind): {
  maxLength: number;
  'data-input-kind': AgentInputKind;
  'data-allow-emoji'?: true;
} {
  const rule = AGENT_INPUT_RULES[kind];
  return {
    maxLength: rule.maxLength,
    'data-input-kind': kind,
    ...(rule.allowEmoji ? { 'data-allow-emoji': true as const } : {}),
  };
}
