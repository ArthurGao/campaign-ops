import { freshSeed } from '../../testing/fixtures';
import type { EvidenceItem, FactEntry, Task } from '../types';
import { isLiveExternal } from './facts';
import { stillBlocking } from './findings';

const finding = (id: string, over: Partial<EvidenceItem>) =>
  ({ ...freshSeed().evidence[0], id, blocks: 'ads', status: 'open', ...over }) as EvidenceItem;
const task = (id: string, status: Task['status']) => ({ id, status }) as Task;

describe('one definition of "still blocking" and "live external fact"', () => {
  it('a blocking finding blocks until dismissed or its task is verified', () => {
    const items = [
      finding('E-1', {}),
      finding('E-2', { status: 'converted', convertedTaskId: 'TASK-1' }),
      finding('E-3', { status: 'converted', convertedTaskId: 'TASK-2' }),
      finding('E-4', { status: 'dismissed' }),
      finding('E-5', { blocks: 'none' }),
    ];
    const tasks = [task('TASK-1', 'live'), task('TASK-2', 'verified')];
    expect(stillBlocking(items, tasks).map((e) => e.id)).toEqual(['E-1', 'E-2']);
  });

  it('a live external fact is neither superseded nor rejected', () => {
    const f = (status: FactEntry['status'], page: FactEntry['page'] = 'external') =>
      ({ status, page }) as FactEntry;
    expect(
      [f('pending'), f('superseded'), f('rejected'), f('confirmed', 'internal')].map(
        isLiveExternal,
      ),
    ).toEqual([true, false, false, false]);
  });
});
