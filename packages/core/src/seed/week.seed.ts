import type { HourCategory } from '../domain/enums';
import { bullets, nzDate, reportNumbers } from '../domain/rules/week';
import type { TimeEntry, WeekPlan, WeeklyReport } from '../domain/types';
import { APPROVER, PM } from './actors';
import { funnelSeed, reconSeed } from './recon.seed';
import { at, ev, tracked } from './time';

// Campaign weeks: 1 starts Mon 28 Sep, 2 on Mon 5 Oct, 3 (current; SEED_NOW is its Thursday) on 12 Oct.
export const WEEK_1 = '2026-09-28';
export const WEEK_2 = '2026-10-05';
export const WEEK_3 = '2026-10-12';

type Raw = [days: number, category: HourCategory, hours: number, note?: string];

// Week 1 ≈ the source's first-week plan (15 h); week 2 ran 0.5 h over; week 3 is at 9.5 h by Thursday.
const RAW: Record<string, Raw[]> = {
  [WEEK_1]: [
    [-17, 'management', 2.5, 'Fact Sheet v0, board, question list'],
    [-17, 'audit', 1.5, 'Audit run and spot checks'],
    [-16, 'management', 1.5, 'Kickoff meeting'],
    [-16, 'audit', 1.5, 'Evidence review, E-03 and E-07 confirmed'],
    [-15, 'site', 2.5, 'Tracking fix coordination'],
    [-14, 'review', 1, 'Sales process and baseline'],
    [-14, 'social', 1, 'First video brief'],
    [-13, 'management', 2.5, 'Client follow-ups, weekly report'],
    [-13, 'buffer', 1, 'GTM access took a second call'],
  ],
  [WEEK_2]: [
    [-10, 'management', 2, 'Weekly plan, approvals batch'],
    [-10, 'site', 1.5, 'Enquiry form field'],
    [-9, 'social', 3, 'Video QA, captions, packages'],
    [-9, 'audit', 1.5, 'Checking agent drafts against the Fact Sheet'],
    [-8, 'seo_geo', 1.5, 'SEO findings into the page queue'],
    [-8, 'site', 1.5, 'Landing page retest'],
    [-7, 'ads', 1, 'Ad launch checklist'],
    [-7, 'review', 0.5, 'Leads with Sales'],
    [-6, 'management', 2.5, 'Client follow-ups, weekly report'],
    [-6, 'buffer', 1.5, 'Lead event double-firing again after a GTM publish'],
  ],
  [WEEK_3]: [
    [-3, 'management', 1.5, 'Weekly plan'],
    [-3, 'ads', 1, 'Google Search ad copy'],
    [-2, 'social', 2, 'Caption QA for TASK-022 and TASK-024'],
    [-2, 'audit', 1, 'Spot checks on Outbound drafts'],
    [-1, 'ads', 1, 'Meta ad set B review with the Feedback run'],
    [-1, 'review', 1, 'Leads with Sales'],
    [-1, 'seo_geo', 0.5, 'GEO observations'],
    [0, 'site', 0.5, 'Departure table change'],
    [0, 'management', 1, 'Approval chasing'],
  ],
};

export function timeEntriesSeed(): TimeEntry[] {
  let n = 0;
  return Object.entries(RAW).flatMap(([week, rows]) =>
    rows.map(([days, category, hours, note]) => {
      n += 1;
      const createdAt = at(days, '17:30');
      return {
        id: `TIME-${String(n).padStart(4, '0')}`,
        week,
        date: nzDate(createdAt),
        category,
        hours,
        ...(note ? { note } : {}),
        actor: PM,
        createdAt,
      };
    }),
  );
}

export function weekPlansSeed(): WeekPlan[] {
  return [
    {
      week: WEEK_2,
      taskIds: ['TASK-016', 'TASK-018', 'TASK-021', 'TASK-028', 'TASK-031'],
      ...tracked(at(-10, '09:00'), [ev(at(-10, '09:00'), PM, 'planned', '5 tasks')]),
    },
    {
      week: WEEK_3,
      taskIds: ['TASK-018', 'TASK-021', 'TASK-022', 'TASK-024', 'TASK-030', 'TASK-033'],
      ...tracked(at(-3, '09:00'), [ev(at(-3, '09:00'), PM, 'planned', '6 tasks')]),
    },
  ];
}

export function weeklyReportsSeed(): WeeklyReport[] {
  const funnel = funnelSeed();
  const recon = reconSeed();
  const sent = (week: string, days: number, done: string[], blocked: string[], next: string[]) => {
    const sentAt = at(days, '17:00');
    return {
      id: `WR-${week}`,
      week,
      status: 'sent' as const,
      done: bullets(done),
      blocked: bullets(blocked),
      next: bullets(next),
      numbers: reportNumbers(week, funnel, recon),
      sentAt,
      sentBy: PM,
      ...tracked(at(days, '15:00'), [
        ev(at(days, '15:00'), PM, 'draft saved'),
        ev(sentAt, PM, 'sent', `to ${APPROVER.name}`),
      ]),
    };
  };
  return [
    sent(
      WEEK_1,
      -13,
      [
        'Fact Sheet v0 and the task board are set up',
        'Audit run: findings in Evidence, two of them blocking (E-03, E-07)',
        'Kickoff held; the pre-approved scope is signed',
        'First video brief SOC-2027CT-003 sent to the factory',
      ],
      [
        'E-03: the Lead event fires twice; waiting on GTM access',
        'FS-04 departure and FS-15 price are not confirmed',
      ],
      [
        'Fix the Lead event (E-03) and retest',
        'First organic posts from the itinerary video',
        'Agree the valid-lead definition with Sales',
      ],
    ),
    sent(
      WEEK_2,
      -6,
      [
        'TASK-016: the enquiry form asks for the preferred travel month',
        'TASK-028: Instagram reel published and verified',
        'TASK-031: Meta ad set B is live',
      ],
      [
        'TASK-021 waits on FS-04 departure',
        'Landing page not traffic-ready: the Lead event still fires twice (E-03)',
        'Meta ad set B spent with no valid leads this week',
      ],
      [
        'Client to confirm FS-04, FS-15 and FS-16',
        'Google Search ad TASK-030 once the four gates pass',
        'Feedback run on ad set B',
      ],
    ),
  ];
}
