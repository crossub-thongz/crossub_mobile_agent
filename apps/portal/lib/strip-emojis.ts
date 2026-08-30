/**
 * Strip emoji (and leftover joiners / variation selectors) from user-typed text.
 *
 * `stripEmojis` is the helper to call on any string. Input / Textarea and
 * `installGlobalEmojiFilter` apply it to every field automatically.
 *
 * Opt out of a single field with `data-allow-emoji`.
 *
 * Uses code-point ranges instead of `\p{Extended_Pictographic}` so the strip
 * still works after bundling and for the OS emoji picker (composition events).
 */

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

export function propAllowsEmoji(value: unknown): boolean {
  return value === '' || value === true || value === 'true';
}

export function isEmojiFilteredField(
  el: EventTarget | null,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (allowsEmoji(el.dataset)) return false;
  if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) return false;
  if (el.readOnly || el.disabled) return false;
  return true;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, next: string) {
  if (typeof window === 'undefined') {
    el.value = next;
    return;
  }
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, next);
  else el.value = next;
}

function restoreCaret(el: HTMLInputElement | HTMLTextAreaElement, previous: string, caret: number) {
  const nextCaret = stripEmojis(previous.slice(0, caret)).length;
  try {
    el.setSelectionRange(nextCaret, nextCaret);
  } catch {
    // Some input types reject setSelectionRange.
  }
}

function applyStrippedValue(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  const previous = el.value;
  const next = stripEmojis(previous);
  if (next === previous) return false;
  const caret = el.selectionStart ?? next.length;
  setNativeValue(el, next);
  restoreCaret(el, previous, caret);
  return true;
}

/** Wrap an input/textarea onChange so the handler never sees emoji. */
export function bindTextValueWithoutEmojis<E extends { target: { value: string } }>(
  handler?: (event: E) => void,
): (event: E) => void {
  return (event) => {
    const next = stripEmojis(event.target.value);
    if (next !== event.target.value) {
      setNativeValue(event.target as HTMLInputElement | HTMLTextAreaElement, next);
    }
    handler?.(event);
  };
}

function insertCleanText(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  el.setRangeText(text, start, end, 'end');
  el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text }));
}

/** Document-level capture so native <input> / <textarea> are covered too. */
export function installGlobalEmojiFilter(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onBeforeInput = (event: Event) => {
    const ie = event as InputEvent;
    if (ie.isComposing || !ie.cancelable) return;
    if (!ie.inputType?.startsWith('insert')) return;
    const el = event.target;
    if (!isEmojiFilteredField(el)) return;
    const data = ie.data;
    if (data == null) return;
    const cleaned = stripEmojis(data);
    if (cleaned === data) return;
    event.preventDefault();
    if (cleaned) insertCleanText(el, cleaned);
  };

  const onPaste = (event: Event) => {
    const pe = event as ClipboardEvent;
    const el = event.target;
    if (!isEmojiFilteredField(el)) return;
    const text = pe.clipboardData?.getData('text/plain');
    if (text == null) return;
    const cleaned = stripEmojis(text);
    if (cleaned === text) return;
    event.preventDefault();
    insertCleanText(el, cleaned);
  };

  const onInputOrCompositionEnd = (event: Event) => {
    const el = event.target;
    if (!isEmojiFilteredField(el)) return;
    applyStrippedValue(el);
  };

  window.addEventListener('beforeinput', onBeforeInput, true);
  window.addEventListener('paste', onPaste, true);
  window.addEventListener('input', onInputOrCompositionEnd, true);
  window.addEventListener('compositionend', onInputOrCompositionEnd, true);

  return () => {
    window.removeEventListener('beforeinput', onBeforeInput, true);
    window.removeEventListener('paste', onPaste, true);
    window.removeEventListener('input', onInputOrCompositionEnd, true);
    window.removeEventListener('compositionend', onInputOrCompositionEnd, true);
  };
}
