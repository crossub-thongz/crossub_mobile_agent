/**
 * Form input primitives shared by `components/ui/input.tsx` and anything that has to reason
 * about an input's type without comparing raw strings.
 */
export const INPUT_TYPE = {
  NUMBER: 'number',
} as const;

export type InputType = (typeof INPUT_TYPE)[keyof typeof INPUT_TYPE];

/**
 * ⭐ CRS-0150. A `type="number"` field is a spinner: the wheel over a *focused* one steps its
 * value, silently, with no keystroke and nothing on screen to say it happened. On a money field
 * that is a changed amount the agent has already read and accepted — two rent reviews raised
 * sixteen minutes apart on 27 Aug 2026 captured base rents ($529 and $930) that exist on no
 * record anywhere, one step down and thirty steps up.
 *
 * The listener must be registered natively and non-passively: React attaches its own wheel
 * handlers passively at the root, so `preventDefault()` from an `onWheel` prop is ignored.
 * Blurring the field instead would also stop it, at the cost of losing the caret mid-edit.
 */
export const NUMBER_INPUT_WHEEL_EVENT = 'wheel';
