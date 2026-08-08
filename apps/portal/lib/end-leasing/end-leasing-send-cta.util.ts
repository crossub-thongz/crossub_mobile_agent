/** Primary send / CTA styling for end-leasing workflow buttons (size unchanged). */
export function endLeasingSendCtaVariant(
  sent: boolean,
  enabled = true,
): 'default' | 'secondary' {
  if (sent || enabled) return 'default';
  return 'secondary';
}

export function endLeasingSendCtaClassName(sent: boolean, enabled = true): string {
  if (sent) {
    return 'h-9 gap-1.5 border-transparent bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-100';
  }
  if (enabled) {
    return 'h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground shadow-md ring-2 ring-primary/25 hover:bg-primary/90';
  }
  return 'h-9 gap-1.5 text-xs';
}
