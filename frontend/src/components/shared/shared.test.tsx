import { render, screen, within } from '@testing-library/react';
import { buildSeed, SEED_NOW, toView, type AdGates, type FactView } from '@campaign-ops/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CplCell, ReconTable } from '@/pages/leads/ReconTable';
import { FactChip } from './FactChip';
import { GateBadges } from './GateBadges';

const facts = new Map(buildSeed().facts.map((f) => [f.id, toView(f, SEED_NOW)]));
const fact = (id: string): FactView => facts.get(id)!;

function wrap(ui: React.ReactElement) {
  // FactChip reads the fact index through TanStack Query; give it an idle client.
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('FactChip colour by status (UX rule 2)', () => {
  it.each([
    ['FS-07', 'usable', 'publicly usable'],
    ['FS-09', 'expiring', 'confirmed, expiring soon'],
    ['FS-04', 'unconfirmed', 'not usable'],
    ['FS-12', 'unconfirmed', 'not usable'],
    ['FS-03', 'unconfirmed', 'not usable'],
    ['FS-20', 'internal', 'internal — never public'],
  ])('%s renders as %s with a text label', (id, tone, label) => {
    wrap(<FactChip id={id} fact={fact(id)} />);
    const chip = screen.getByText(id).closest('[data-tone]')!;
    expect(chip.getAttribute('data-tone')).toBe(tone);
    expect(within(chip as HTMLElement).getByText(`(${label})`)).toBeInTheDocument();
  });

  it('an unknown id is treated as not usable', () => {
    wrap(<FactChip id="FS-99" />);
    expect(screen.getByText('FS-99').closest('[data-tone]')?.getAttribute('data-tone')).toBe(
      'unconfirmed',
    );
  });
});

describe('ReconTable zero denominator (UX rule 7, F6)', () => {
  it('shows "No valid leads yet · spent $X" instead of a CPL', () => {
    render(<CplCell spendCents={24_000} cpl={null} />);
    expect(screen.getByText('No valid leads yet · spent $240.00')).toBeInTheDocument();
  });

  it('never renders 0, ∞ or NaN for the seeded week-2 meta_ads row', () => {
    const row = {
      weekStart: '2026-10-04T11:00:00.000Z',
      channel: 'meta_ads' as const,
      spendCents: 24_000,
      platformReportedConversions: 8,
      crmValidLeads: 0,
      paidCpl: null,
      overReportRatio: null,
    };
    render(<ReconTable rows={[row]} />);
    const tr = screen.getByText('Meta ads').closest('tr')!;
    expect(within(tr).getByText('No valid leads yet · spent $240.00')).toBeInTheDocument();
    expect(tr.textContent).not.toMatch(/NaN|∞|Infinity|\$0\.00/);
    expect(within(tr).getByText('platform only')).toBeInTheDocument();
  });

  it('formats a real CPL as NZD', () => {
    render(<CplCell spendCents={20_000} cpl={6_667} />);
    expect(screen.getByText('$66.67')).toBeInTheDocument();
  });
});

describe('GateBadges from AdGates (R3)', () => {
  const gates: AdGates = {
    productFactsConfirmed: true,
    landingPageReady: false,
    creativeApproved: true,
    budgetAndMonitoringApproved: true,
  };

  it('marks each gate passed or not, in order, and counts them', () => {
    const { container } = render(<GateBadges gates={gates} />);
    const cells = [...container.querySelectorAll('[data-gate]')].map((el) => [
      el.getAttribute('data-gate'),
      el.getAttribute('data-ok'),
    ]);
    expect(cells).toEqual([
      ['productFactsConfirmed', 'true'],
      ['landingPageReady', 'false'],
      ['creativeApproved', 'true'],
      ['budgetAndMonitoringApproved', 'true'],
    ]);
    expect(screen.getByText('3/4 passed — cannot go live')).toBeInTheDocument();
    expect(screen.getByText('Not met:')).toBeInTheDocument();
  });

  it('compact form exposes the count to assistive tech', () => {
    render(<GateBadges gates={{ ...gates, landingPageReady: true }} compact />);
    expect(screen.getByLabelText('Ad gates 4 of 4 passed')).toBeInTheDocument();
  });
});
