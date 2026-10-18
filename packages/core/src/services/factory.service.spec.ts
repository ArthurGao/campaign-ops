import { FixedClock, ManualScheduler } from '../domain/clock';
import { createCore } from '../create-core';
import { PM, SEED_NOW } from '../testing/fixtures';

describe('FactoryService.create', () => {
  it('stamps the current Fact Sheet version and campaign itself, whatever the client sends', () => {
    const clock = new FixedClock(SEED_NOW);
    const core = createCore({ clock, scheduler: new ManualScheduler(clock) });
    const prefill = core.tasks.briefPrefill('TASK-026');
    const brief = core.factory.create(
      { ...prefill, factSheetVersion: 'FS-v0.1', campaign: 'Something else' },
      PM,
    );
    expect([brief.factSheetVersion, brief.campaign]).toEqual([
      core.store.data.factSheetVersion,
      core.store.data.settings.campaign.name,
    ]);
  });
});
