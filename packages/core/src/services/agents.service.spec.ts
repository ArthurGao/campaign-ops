import { FixedClock, ManualScheduler } from '../domain/clock';
import { createCore } from '../create-core';
import { DECIDER, PM, SEED_NOW } from '../testing/fixtures';

function setup() {
  const clock = new FixedClock(SEED_NOW);
  const scheduler = new ManualScheduler(clock);
  const core = createCore({ clock, scheduler });
  return { core, scheduler };
}

describe('AgentsService: test enquiry consent comes from the pre-approved scope', () => {
  it('records the client consent on the audit run instead of asking per run', () => {
    const { core } = setup();
    const on = core.agents.start('audit', undefined, { siteUrl: 'https://x.example' }, PM);
    expect(core.agents.run(on.runId).inputs.testEnquiryApproved).toBe(true);

    core.settings.patch({ preApprovedScope: { testEnquiry: false } }, DECIDER);
    const off = core.agents.start(
      'audit',
      undefined,
      { siteUrl: 'https://x.example', testEnquiryApproved: true },
      PM,
    );
    expect(core.agents.run(off.runId).inputs.testEnquiryApproved).toBe(false);
  });
});
