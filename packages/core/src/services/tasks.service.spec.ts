import { FixedClock, ManualScheduler } from '../domain/clock';
import { createCore } from '../create-core';
import { PM, SEED_NOW } from '../testing/fixtures';

describe('TasksService.create', () => {
  it('reads fact refs from the title and body when none are given, once each', () => {
    const clock = new FixedClock(SEED_NOW);
    const core = createCore({ clock, scheduler: new ManualScheduler(clock) });
    const task = core.tasks.create(
      {
        type: 'social_post',
        title: 'Cities post',
        body: 'Cities [← FS-07]; departs [← FS-04]; again FS-07.',
      },
      PM,
    );
    expect(task.factRefs).toEqual(['FS-07', 'FS-04']);
    // FS-04 is pending in the seed, so the task starts blocked.
    expect(task.status).toBe('blocked');
  });
});
