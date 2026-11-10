const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AU_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * A calendar date as the chat API takes it (YYYY-MM-DD), from that form or the DD/MM/YYYY the
 * API displays; undefined for anything else, so a date it cannot read is left out rather than
 * sent back and refused with the whole message.
 */
export function toIsoCalendarDate(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (ISO_DATE.test(text)) return text;
  const au = AU_DATE.exec(text);
  return au ? `${au[3]}-${au[2]}-${au[1]}` : undefined;
}
