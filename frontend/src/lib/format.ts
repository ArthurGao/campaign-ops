import { formatNzd } from '@campaign-ops/core';

const TZ = 'Pacific/Auckland';

const dayFmt = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayYearFmt = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const tzNameFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, timeZoneName: 'short' });

/** 'Thu 15 Oct' in Pacific/Auckland. */
export function fmtDay(iso?: string): string {
  return iso ? dayFmt.format(new Date(iso)) : '—';
}

/** '15 Oct 2026'. */
export function fmtDate(iso?: string): string {
  return iso ? dayYearFmt.format(new Date(iso)) : '—';
}

/** 'Thu 15 Oct, 10:00'. */
export function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${dayFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function fmtTime(iso?: string): string {
  return iso ? timeFmt.format(new Date(iso)) : '—';
}

/** 'NZDT' / 'NZST' for an instant. */
export function tzName(iso: string): string {
  return (
    tzNameFmt.formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')?.value ?? 'NZ'
  );
}

const DAY = 86_400_000;

/** 'in 3 d', '2 d ago', 'today' relative to `now`. */
export function relDays(iso: string, now: string | Date): string {
  const diff = Math.round((new Date(iso).getTime() - new Date(now).getTime()) / DAY);
  if (diff === 0) return 'today';
  return diff > 0 ? `in ${diff} d` : `${-diff} d ago`;
}

export function money(cents: number): string {
  return formatNzd(cents);
}

/** R6 zero-denominator wording; the UI never shows 0, ∞ or NaN as a CPL. */
export function noValidLeadsText(spendCents: number): string {
  return `No valid leads yet · spent ${formatNzd(spendCents)}`;
}

export function minutesText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const ACRONYMS: Record<string, string> = {
  qa: 'QA',
  seo: 'SEO',
  geo: 'GEO',
  ai: 'AI',
  utm: 'UTM',
  crm: 'CRM',
  pm: 'PM',
};

/** 'awaiting_approval' → 'Awaiting approval', 'qa_passed' → 'QA passed'. */
export function humanize(value: string): string {
  const words = value.split('_').map((w) => ACRONYMS[w.toLowerCase()] ?? w);
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Funnel rates: two decimals under 1% (0.41%), one above (3.3%). */
export function pct(rate: number): string {
  if (rate === 0) return '0%';
  const p = rate * 100;
  return `${p < 1 ? p.toFixed(2) : p.toFixed(1)}%`;
}

/** Relative change against the week before: ▼ 39%, ▲ 3%. */
export function changeText(change: number): string {
  const p = Math.round(Math.abs(change) * 100);
  if (p === 0) return '± 0%';
  return `${change < 0 ? '▼' : '▲'} ${p}%`;
}
