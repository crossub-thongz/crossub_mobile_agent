/**
 * Strip emoji (and leftover joiners / variation selectors) from user-typed text.
 *
 * `stripEmojis` is the helper to call on any string. Input / Textarea apply
 * Agent App rules (no HTML, length, line breaks, emoji policy) in React
 * onChange. A document-level filter must not rewrite field values — that
 * desyncs controlled inputs and they stop accepting keystrokes.
 *
 * Opt a single unclassified field into emoji with `data-allow-emoji`.
 * Prefer `inputKind` / `data-input-kind` for listed field types.
 *
 * Uses code-point ranges instead of `\p{Extended_Pictographic}` so the strip
 * still works after bundling and for the OS emoji picker (composition events).
 */

import { dispatchAgentInputFeedback } from '@/lib/agent-input-feedback-event';
import {
  AGENT_INPUT_RULES,
  agentInputViolationMessages,
  parseAgentInputKind,
  sanitizeAgentInput,
} from '@/lib/agent-input-rules';

const SKIP_INPUT_TYPES = new Set([
  'file',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'hidden',
  'image',
  'color',
  'range',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
  'number',
]);

export const ALLOW_EMOJI_ATTR = 'data-allow-emoji';

function isEmojiScalar(cp: number): boolean {
  if (cp < 0x80) return false;
  if (cp === 0x200d || cp === 0x20e3) return true;
  if (cp >= 0xfe00 && cp <= 0xfe0f) return true;
  if (cp >= 0x20d0 && cp <= 0x20ff) return true;
  if (cp >= 0x2300 && cp <= 0x23ff) return true;
  if (cp >= 0x2600 && cp <= 0x27bf) return true;
  if (cp >= 0x2b00 && cp <= 0x2bff) return true;
  if (cp >= 0x3200 && cp <= 0x32ff) return true;
  if (cp >= 0x1f000 && cp <= 0x1ffff) return true;
  if (cp >= 0xe0020 && cp <= 0xe007f) return true;
  return false;
}

export function stripEmojis(value: string): string {
  if (!value) return value;
  let out = '';
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp == null || isEmojiScalar(cp)) continue;
    out += ch;
  }
  return out;
}

export function allowsEmoji(dataset: DOMStringMap | undefined): boolean {
  const flag = dataset?.allowEmoji;
  return flag === '' || flag === 'true';
}

export function allowsHtml(dataset: DOMStringMap | undefined): boolean {
  const flag = dataset?.allowHtml;
  return flag === '' || flag === 'true';
}

export function propAllowsEmoji(value: unknown): boolean {
  return value === '' || value === true || value === 'true';
}

export function propAllowsHtml(value: unknown): boolean {
  return value === '' || value === true || value === 'true';
}

export function isEmojiFilteredField(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!isTextEntryField(el)) return false;
  return !resolveAllowEmoji(el, true);
}

export function isTextEntryField(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) return false;
  if (el.readOnly || el.disabled) return false;
  return true;
}

export function resolveAllowEmoji(
  el: HTMLInputElement | HTMLTextAreaElement,
  stripEmojiByDefault: boolean,
): boolean {
  const kind = parseAgentInputKind(el.dataset.inputKind);
  if (kind) return AGENT_INPUT_RULES[kind].allowEmoji;
  if (allowsEmoji(el.dataset)) return true;
  return !stripEmojiByDefault;
}

/** Wrap an input/textarea onChange so the handler receives the sanitized value. */
export function bindSanitizedTextValue<E extends { target: { value: string } }>(options: {
  kind?: ReturnType<typeof parseAgentInputKind>;
  allowEmoji: boolean;
  allowHtml?: boolean;
  onChange?: (event: E) => void;
}): (event: E) => void {
  return (event) => {
    const raw = event.target.value;
    const next = sanitizeAgentInput(raw, {
      kind: options.kind,
      allowEmoji: options.allowEmoji,
      allowHtml: options.allowHtml,
      stripEmojis,
    });
    dispatchAgentInputFeedback(
      event.target,
      agentInputViolationMessages(raw, {
        kind: options.kind,
        allowHtml: options.allowHtml,
        allowEmoji: options.allowEmoji,
        stripEmojis,
      }),
    );
    if (next !== raw) {
      // Use the instance setter so React's value tracker stays in sync.
      event.target.value = next;
    }
    options.onChange?.(event);
  };
}

/** Wrap an input/textarea onChange so the handler never sees emoji. */
export function bindTextValueWithoutEmojis<E extends { target: { value: string } }>(
  handler?: (event: E) => void,
): (event: E) => void {
  return bindSanitizedTextValue({ allowEmoji: false, onChange: handler });
}

/**
 * Bump when the filter's event strategy changes so HMR re-installs listeners.
 */
export const AGENT_INPUT_FILTER_REVISION = 5;

type AgentInputFilterHost = Window & {
  __crossubAgentInputFilterCleanup?: () => void;
};

/**
 * Detach any previous document-level filter. Do not rewrite field values here:
 * mutating the DOM during `input` desyncs React controlled fields and they
 * stop accepting keystrokes.
 */
export function installGlobalAgentInputFilter(_options?: {
  stripEmojiByDefault?: boolean;
}): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const host = window as AgentInputFilterHost;
  host.__crossubAgentInputFilterCleanup?.();

  const cleanup = () => {
    if (host.__crossubAgentInputFilterCleanup === cleanup) {
      delete host.__crossubAgentInputFilterCleanup;
    }
  };
  host.__crossubAgentInputFilterCleanup = cleanup;
  return cleanup;
}

/** @deprecated Use installGlobalAgentInputFilter */
export function installGlobalEmojiFilter(): () => void {
  return installGlobalAgentInputFilter({ stripEmojiByDefault: true });
}
