import { renderUtm, utmForChannel } from '../domain/rules/utm';
import type { PackageAsset, PublishPackage, QARecord } from '../domain/types';
import { APPROVER, EXECUTOR, PM } from './actors';
import { CHINA_TOUR_PAGE } from './tasks.seed';
import { UTM_TEMPLATE } from './settings.seed';
import { at, ev, tracked } from './time';

const ACCOUNTS: Record<string, string> = {
  facebook_feed: 'Demo Travel NZ — Facebook Page',
  instagram_reels: '@demotravelnz.example',
  youtube_video: 'Demo Travel NZ — YouTube',
};

const PACKAGE_QA = (when: string): QARecord => ({
  by: PM,
  at: when,
  passed: true,
  checklist: [
    { item: 'Asset ratio matches channel', ok: true },
    { item: 'Caption facts publicly usable', ok: true },
    { item: 'Link generated from UTM template', ok: true },
    { item: 'No duplicate in publish log', ok: true },
  ],
});

function asset(assetId: string, checksum: string): PackageAsset {
  return {
    assetId,
    version: assetId.slice(assetId.lastIndexOf('-') + 1),
    url: `https://factory.example/assets/${assetId}.mp4`,
    checksum,
  };
}

type PackageInit = Pick<
  PublishPackage,
  | 'id'
  | 'sourceTaskId'
  | 'channel'
  | 'asset'
  | 'caption'
  | 'factRefs'
  | 'scheduledAt'
  | 'status'
  | 'approval'
  | 'publishLog'
> &
  Partial<Pick<PublishPackage, 'sourceBriefId' | 'verificationNote' | 'factSheetVersion'>> & {
    created: string;
    history: PublishPackage['events'];
  };

function pkg(init: PackageInit): PublishPackage {
  const { created, history, ...rest } = init;
  const { source, medium } = utmForChannel(init.channel);
  return {
    account: ACCOUNTS[init.channel],
    link: renderUtm(UTM_TEMPLATE, {
      base: CHINA_TOUR_PAGE,
      source,
      medium,
      content: init.id.toLowerCase(),
    }),
    factSheetVersion: 'FS-v1.3',
    qa: PACKAGE_QA(created),
    executor: EXECUTOR.name,
    captionHistory: [{ ...init.caption, at: created }],
    assetHistory: init.asset ? [{ ...init.asset, at: created }] : [],
    takenDown: false,
    needsConfirmation: false,
    needsRereview: false,
    ...rest,
    ...tracked(created, history),
  };
}

const approvedBy = (when: string, assetVersion: string, captionVersion: string) => ({
  approver: APPROVER,
  status: 'approved' as const,
  at: when,
  approvedAssetVersion: assetVersion,
  approvedCaptionVersion: captionVersion,
});

export function packagesSeed(): PublishPackage[] {
  return [
    pkg({
      id: 'PUB-2027CT-007',
      sourceTaskId: 'TASK-028',
      channel: 'instagram_reels',
      asset: asset('VID-0029-9x16-v1', 'sha256:a113…9e02'),
      caption: {
        version: 'CAP-007-v1',
        text: "Four cities in 30 seconds: Beijing, Xi'an, Guilin, Shanghai. Link in bio.",
      },
      factRefs: ['FS-07'],
      factSheetVersion: 'FS-v1.1',
      scheduledAt: at(-12, '12:00'),
      status: 'verified',
      approval: approvedBy(at(-13, '11:00'), 'v1', 'CAP-007-v1'),
      publishLog: [
        { at: at(-13, '14:00'), actor: EXECUTOR, action: 'scheduled' },
        {
          at: at(-12, '12:00'),
          actor: EXECUTOR,
          action: 'published',
          postUrl: 'https://instagram.example/p/ct27-007',
        },
        { at: at(-8, '08:41'), actor: PM, action: 'verified', note: 'RUN-0006-O2: match' },
      ],
      created: at(-13, '10:00'),
      history: [
        ev(at(-13, '10:00'), PM, 'created'),
        ev(at(-13, '11:00'), APPROVER, 'approved'),
        ev(at(-8, '08:41'), PM, 'verified'),
      ],
    }),
    pkg({
      id: 'PUB-2027CT-008',
      sourceTaskId: 'TASK-029',
      channel: 'facebook_feed',
      asset: asset('VID-0029-1x1-v1', 'sha256:5c7d…11f8'),
      caption: {
        version: 'CAP-008-v1',
        text: 'Every China Tour 2027 group travels with an English-speaking guide from New Zealand. Learn more at the link.',
      },
      factRefs: ['FS-01'],
      scheduledAt: at(-5, '18:00'),
      status: 'mismatch',
      approval: approvedBy(at(-6, '11:30'), 'v1', 'CAP-008-v1'),
      verificationNote:
        'Live caption adds "Seats are limited — book now." which is not in approved CAP-008-v1',
      publishLog: [
        { at: at(-6, '15:00'), actor: EXECUTOR, action: 'scheduled' },
        {
          at: at(-5, '18:00'),
          actor: EXECUTOR,
          action: 'published',
          postUrl: 'https://facebook.example/demotravelnz/posts/ct27-008',
        },
        {
          at: at(-1, '08:30'),
          actor: PM,
          action: 'mismatch',
          note: 'RUN-0008-O1: live caption adds one sentence',
        },
      ],
      created: at(-6, '10:00'),
      history: [
        ev(at(-6, '10:00'), PM, 'created'),
        ev(at(-6, '11:30'), APPROVER, 'approved'),
        ev(at(-1, '08:30'), PM, 'mismatch'),
      ],
    }),
    pkg({
      id: 'PUB-2027CT-009',
      sourceTaskId: 'TASK-027',
      channel: 'facebook_feed',
      asset: asset('VID-0029-4x5-v1', 'sha256:e0a4…3b77'),
      caption: {
        version: 'CAP-009-v1',
        text: "What's included: return flights from Auckland, hotels, an English-speaking guide and most meals. Learn more at the link.",
      },
      factRefs: ['FS-11'],
      scheduledAt: at(-6, '18:00'),
      status: 'published',
      approval: approvedBy(at(-7, '11:30'), 'v1', 'CAP-009-v1'),
      publishLog: [
        { at: at(-7, '15:00'), actor: EXECUTOR, action: 'scheduled' },
        {
          at: at(-6, '18:00'),
          actor: EXECUTOR,
          action: 'published',
          postUrl: 'https://facebook.example/demotravelnz/posts/ct27-009',
        },
      ],
      created: at(-7, '10:00'),
      history: [
        ev(at(-7, '10:00'), PM, 'created'),
        ev(at(-7, '11:30'), APPROVER, 'approved'),
        ev(at(-6, '18:00'), EXECUTOR, 'published'),
      ],
    }),
    pkg({
      id: 'PUB-2027CT-010',
      sourceTaskId: 'TASK-020',
      sourceBriefId: 'SOC-2027CT-003',
      channel: 'youtube_video',
      asset: asset('VID-0031-16x9-v1', 'sha256:c93a…e512'),
      caption: {
        version: 'CAP-010-v1',
        text: "Four cities in one guided tour: Beijing, Xi'an, Guilin and Shanghai. Flights from Auckland, hotels and an English-speaking guide included. Learn more at the link.",
      },
      factRefs: ['FS-07', 'FS-11'],
      scheduledAt: at(2, '18:00'),
      status: 'scheduled',
      approval: approvedBy(at(-3, '11:30'), 'v1', 'CAP-010-v1'),
      publishLog: [{ at: at(-2, '14:00'), actor: EXECUTOR, action: 'scheduled' }],
      created: at(-4, '10:00'),
      history: [
        ev(at(-4, '10:00'), PM, 'created'),
        ev(at(-3, '11:30'), APPROVER, 'approved'),
        ev(at(-2, '14:00'), EXECUTOR, 'scheduled'),
      ],
    }),
    pkg({
      id: 'PUB-2027CT-011',
      sourceTaskId: 'TASK-025',
      channel: 'instagram_reels',
      asset: asset('VID-0029-9x16-v1', 'sha256:a113…9e02'),
      caption: {
        version: 'CAP-011-v1',
        text: 'Four cities in 30 seconds. Which one would you visit first? Link in bio.',
      },
      factRefs: ['FS-07'],
      scheduledAt: at(4, '12:00'),
      status: 'approved',
      approval: approvedBy(at(-2, '11:30'), 'v1', 'CAP-011-v1'),
      publishLog: [],
      created: at(-3, '10:00'),
      history: [ev(at(-3, '10:00'), PM, 'created'), ev(at(-2, '11:30'), APPROVER, 'approved')],
    }),
    pkg({
      id: 'PUB-2027CT-012',
      sourceTaskId: 'TASK-024',
      sourceBriefId: 'SOC-2027CT-003',
      channel: 'facebook_feed',
      asset: asset('VID-0031-4x5-v2', 'sha256:2d88…7f30'),
      caption: {
        version: 'CAP-012-v1',
        text: "See Beijing, Xi'an, Guilin and Shanghai with an English-speaking guide. Flights from Auckland included. Learn more at the link.",
      },
      factRefs: ['FS-07', 'FS-11'],
      scheduledAt: at(3, '18:30'),
      status: 'awaiting_approval',
      approval: { status: 'pending' },
      publishLog: [],
      created: at(-2, '15:10'),
      history: [ev(at(-2, '15:10'), PM, 'created', 'From TASK-024')],
    }),
  ];
}

/** What the mock social platforms return for a live post URL (used by Outbound verify). */
export function livePostsSeed(): Record<string, string> {
  return {
    'https://instagram.example/p/ct27-007':
      "Four cities in 30 seconds: Beijing, Xi'an, Guilin, Shanghai. Link in bio.",
    'https://facebook.example/demotravelnz/posts/ct27-008':
      'Every China Tour 2027 group travels with an English-speaking guide from New Zealand. Seats are limited — book now. Learn more at the link.',
    'https://facebook.example/demotravelnz/posts/ct27-009':
      "What's included: return flights from Auckland, hotels, an English-speaking guide and most meals. Learn more at the link.",
  };
}
