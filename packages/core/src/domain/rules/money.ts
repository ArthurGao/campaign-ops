/** NZD from integer cents, e.g. 24000 → '$240.00'. Never call this for values marked TBC. */
export function formatNzd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
