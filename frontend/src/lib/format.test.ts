import { changeText, humanize, minutesText, noValidLeadsText, pct, relDays } from './format';

describe('format', () => {
  it('humanizes enums with acronyms kept upper case', () => {
    expect(humanize('awaiting_approval')).toBe('Awaiting approval');
    expect(humanize('qa_passed')).toBe('QA passed');
    expect(humanize('seo')).toBe('SEO');
    expect(humanize('ai_search')).toBe('AI search');
  });

  it('formats durations, relative days and the zero-denominator text', () => {
    expect(minutesText(1562)).toBe('26 h 2 min');
    expect(relDays('2026-10-25T20:00:00.000Z', '2026-10-14T21:00:00.000Z')).toBe('in 11 d');
    expect(noValidLeadsText(24_000)).toBe('No valid leads yet · spent $240.00');
  });

  it('formats funnel rates with enough digits to tell weeks apart, and their change', () => {
    expect(pct(0.0329)).toBe('3.3%');
    expect(pct(6 / 1_480)).toBe('0.41%');
    expect(pct(0)).toBe('0%');
    expect(changeText(-0.392)).toBe('▼ 39%');
    expect(changeText(0.031)).toBe('▲ 3%');
    expect(changeText(0.001)).toBe('± 0%');
  });
});
