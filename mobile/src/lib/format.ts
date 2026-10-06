/**
 * Small display formatters shared by screens.
 * Dates are written as "6 Oct" (DESIGN_SYSTEM.md, Voice): short, and the
 * same on every phone regardless of its locale settings.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A timestamp (ms) as "6 Oct", in the phone's local time zone. */
export function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
