import type { Brief, Receipt } from '../domain/types';
import { PM, SYSTEM } from './actors';
import { at, ev, tracked } from './time';

const MARKET = 'NZ English market; deliver in English; follow client brand guide';
const FORBIDDEN = [
  'Prices or price ranges',
  'Departure dates',
  'Visa or passport claims',
  'Real customer faces or names',
];
const REQUIREMENTS = [
  'Burned-in captions',
  'Logo end card with URL in safe area',
  'Licensed music with proof',
  'No AI-generated people',
];
const LICENSE_0031 = 'https://example.com/licenses/music-vid-0031.pdf';

const receiptV1: Receipt = {
  version: 'v1',
  deliveredAt: at(-11, '16:00'),
  assets: [
    {
      assetId: 'VID-0031-4x5-v1',
      ratio: '4:5',
      durationSec: 30,
      url: 'https://factory.example/assets/VID-0031-4x5-v1.mp4',
      checksum: 'sha256:4f1c…a91e',
    },
    {
      assetId: 'VID-0031-9x16-v1',
      ratio: '9:16',
      durationSec: 30,
      url: 'https://factory.example/assets/VID-0031-9x16-v1.mp4',
      checksum: 'sha256:7b20…0c4d',
    },
    {
      assetId: 'VID-0031-16x9-v1',
      ratio: '16:9',
      durationSec: 30,
      url: 'https://factory.example/assets/VID-0031-16x9-v1.mp4',
      checksum: 'sha256:c93a…e512',
    },
  ],
  factsUsed: ['FS-07', 'FS-11'],
  musicLicense: { status: 'licensed', proof: LICENSE_0031 },
  creditsUsed: 12,
  renderAttempts: 1,
  issues: [],
};

export function factorySeed(): Brief[] {
  return [
    {
      id: 'SOC-2027CT-003',
      taskId: 'TASK-011',
      campaign: 'China Tour 2027',
      objective:
        'Itinerary highlights: show the four cities and what is included, end on the enquiry link',
      marketLanguage: MARKET,
      factSheetVersion: 'FS-v1.1',
      allowedFacts: ['FS-07', 'FS-11'],
      forbidden: FORBIDDEN,
      deliverables: [
        { channel: 'facebook_feed', ratio: '4:5' },
        { channel: 'instagram_reels', ratio: '9:16' },
        { channel: 'youtube_video', ratio: '16:9' },
      ],
      requirements: REQUIREMENTS,
      deadline: at(-9, '17:00'),
      costCap: { maxRerenders: 2, maxCredits: 20 },
      approver: 'Sam Carter',
      status: 'qa_passed',
      version: 2,
      receipts: [
        receiptV1,
        {
          version: 'v2',
          deliveredAt: at(-9, '12:00'),
          assets: [
            {
              assetId: 'VID-0031-4x5-v2',
              ratio: '4:5',
              durationSec: 30,
              url: 'https://factory.example/assets/VID-0031-4x5-v2.mp4',
              checksum: 'sha256:2d88…7f30',
            },
          ],
          factsUsed: ['FS-07', 'FS-11'],
          musicLicense: { status: 'licensed', proof: LICENSE_0031 },
          creditsUsed: 15,
          renderAttempts: 2,
          issues: [],
        },
      ],
      qa: {
        by: PM,
        at: at(-8, '10:00'),
        passed: true,
        receiptVersion: 'v2',
        reviewerName: 'Jordan Reid',
        checklist: [
          { item: 'Ratios, lengths and checksums match the brief', ok: true },
          { item: 'facts_used ⊆ allowed_facts', ok: true },
          { item: 'Captions, voice-over and key frames reviewed', ok: true },
          { item: 'Music license proof present', ok: true },
          { item: 'Credits within cap', ok: true },
        ],
      },
      needsRereview: false,
      returnNotes: [
        {
          version: 1,
          note: '4:5 end card crops the link — re-render 4:5 only',
          at: at(-10, '09:00'),
        },
      ],
      ...tracked(at(-13, '12:00'), [
        ev(at(-13, '12:00'), PM, 'created', 'From TASK-011'),
        ev(at(-13, '12:05'), PM, 'sent', 'Duplicate check by task_id passed'),
        ev(at(-11, '16:00'), SYSTEM, 'delivered', 'Receipt v1'),
        ev(at(-10, '09:00'), PM, 'qa_returned', '4:5 end card crops the link'),
        ev(at(-9, '12:00'), SYSTEM, 'delivered', 'Receipt v2'),
        ev(at(-8, '10:00'), PM, 'qa_passed', 'Receipt v2'),
      ]),
    },
    {
      id: 'SOC-2027CT-004',
      taskId: 'TASK-012',
      campaign: 'China Tour 2027',
      objective:
        'Vertical teaser for the four cities; no dates until the departure fact is confirmed',
      marketLanguage: MARKET,
      factSheetVersion: 'FS-v1.3',
      allowedFacts: ['FS-07'],
      forbidden: FORBIDDEN,
      deliverables: [
        { channel: 'instagram_reels', ratio: '9:16' },
        { channel: 'tiktok', ratio: '9:16' },
      ],
      requirements: REQUIREMENTS,
      deadline: at(3, '17:00'),
      costCap: { maxRerenders: 1, maxCredits: 10 },
      approver: 'Sam Carter',
      status: 'in_production',
      version: 1,
      receipts: [],
      needsRereview: false,
      returnNotes: [],
      ...tracked(at(-4, '11:00'), [
        ev(at(-4, '11:00'), PM, 'created', 'From TASK-012'),
        ev(at(-4, '11:05'), PM, 'sent', 'Duplicate check by task_id passed'),
        ev(at(-4, '13:00'), SYSTEM, 'accepted'),
        ev(at(-3, '09:00'), SYSTEM, 'in_production'),
      ]),
    },
    {
      id: 'SOC-2027CT-005',
      taskId: 'TASK-013',
      campaign: 'China Tour 2027',
      objective: "Square explainer of what's included; no price",
      marketLanguage: MARKET,
      factSheetVersion: 'FS-v1.2',
      allowedFacts: ['FS-11'],
      forbidden: FORBIDDEN,
      deliverables: [{ channel: 'facebook_feed', ratio: '1:1' }],
      requirements: REQUIREMENTS,
      deadline: at(-1, '17:00'),
      costCap: { maxRerenders: 1, maxCredits: 10 },
      approver: 'Sam Carter',
      status: 'delivered',
      version: 1,
      receipts: [
        {
          version: 'v1',
          deliveredAt: at(-1, '15:30'),
          assets: [
            {
              assetId: 'VID-0033-1x1-v1',
              ratio: '1:1',
              durationSec: 20,
              url: 'https://factory.example/assets/VID-0033-1x1-v1.mp4',
              checksum: 'sha256:91be…44a2',
            },
          ],
          factsUsed: ['FS-11', 'FS-15'],
          musicLicense: {
            status: 'licensed',
            proof: 'https://example.com/licenses/music-vid-0033.pdf',
          },
          creditsUsed: 8,
          renderAttempts: 1,
          issues: ['End card shows a price placeholder'],
        },
      ],
      needsRereview: false,
      returnNotes: [],
      ...tracked(at(-7, '10:00'), [
        ev(at(-7, '10:00'), PM, 'created', 'From TASK-013'),
        ev(at(-7, '10:05'), PM, 'sent', 'Duplicate check by task_id passed'),
        ev(at(-1, '15:30'), SYSTEM, 'delivered', 'Receipt v1'),
      ]),
    },
  ];
}
