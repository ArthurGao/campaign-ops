import { freshSeed } from '../../testing/fixtures';
import { cplText, overReportRatio, paidCpl, summarize, withDerived } from './recon';

describe('reconciliation rules (R6)', () => {
  it('paid CPL: spend ÷ valid leads; null with spend and zero leads; undefined without spend', () => {
    expect(paidCpl(20_000, 3)).toBe(6_667);
    expect(paidCpl(24_000, 0)).toBeNull();
    expect(paidCpl(0, 2)).toBeUndefined();
  });

  it('zero denominator reads as a message, never 0 / ∞ / NaN (F6)', () => {
    expect(cplText(24_000, 0)).toBe('no valid leads yet, spent $240.00');
    expect(cplText(20_000, 4)).toBe('$50.00');
  });

  it('over-report ratio', () => {
    expect(overReportRatio(9, 3)).toBe(3);
    expect(overReportRatio(8, 0)).toBeNull();
    expect(overReportRatio(0, 0)).toBeUndefined();
  });

  it('derives the seeded week-2 meta_ads row as zero-denominator', () => {
    const seed = freshSeed();
    const week2 = [...new Set(seed.recon.map((r) => r.weekStart))][1];
    const row = withDerived(
      seed.recon.find((r) => r.weekStart === week2 && r.channel === 'meta_ads')!,
    );
    expect(row).toMatchObject({ paidCpl: null, overReportRatio: null });
  });

  it('summarises by channel and computes total paid CPL over paid channels only', () => {
    const { byChannel, totals } = summarize(freshSeed().recon);
    expect(byChannel.find((c) => c.channel === 'meta_ads')).toMatchObject({
      spendCents: 57_000,
      crmValidLeads: 4,
      paidCpl: 14_250,
    });
    expect(totals).toMatchObject({
      spendCents: 104_000,
      crmValidLeads: 18,
      paidCpl: Math.round(104_000 / 10),
    });
  });
});
