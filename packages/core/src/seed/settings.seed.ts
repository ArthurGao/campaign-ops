import type { OpsStatus, Settings } from '../domain/types';
import { APPROVER, DECIDER, EXECUTOR, PM, SALES } from './actors';
import { at, ev } from './time';
import { CHINA_TOUR_PAGE } from './tasks.seed';

export const UTM_TEMPLATE =
  '{base}?utm_source={source}&utm_medium={medium}&utm_campaign=china_tour_2027&utm_content={content}';

export function settingsSeed(): Settings {
  return {
    campaign: {
      client: 'Demo Travel (NZ)',
      name: 'China Tour 2027',
      promotionWindow: 'Oct 2026 – Feb 2027 [dates TBC]',
      startDate: at(-17, '09:00'),
    },
    preApprovedScope: {
      budgetCapCentsByChannel: { google_search: 60_000, meta_ads: 60_000, tiktok: 0 },
      pauseConditions: [
        'Pause an ad set when spend reaches $150 in 10 days with 0 valid leads',
        'Pause all ads if the Lead event stops firing for 24 hours',
        'Pause any ad the platform disapproves',
      ],
      allowedAssetScope: 'Factory videos that passed QA, and captions citing only confirmed external Fact Sheet entries',
      pmMayApproveNonSubstantive: true,
      nonSubstantiveList: ['typos', 'punctuation', 'schedule time within the same day'],
      signedBy: DECIDER.name,
      signedAt: at(-16, '11:00'),
    },
    people: {
      pm: PM.name,
      approvers: { facts: APPROVER.name, content: APPROVER.name, site: APPROVER.name, budget: DECIDER.name },
      decisionMaker: DECIDER.name,
      alertOwnerOutsideHours: { name: EXECUTOR.name, contact: '+64 21 000 0099', responseMinutes: 60 },
      executors: [EXECUTOR.name],
      sales: [SALES.name],
      landingPageDailyOwner: SALES.name,
    },
    utmTemplate: UTM_TEMPLATE,
    prohibitedWords: ['guaranteed', 'cheapest', 'visa-free', 'no visa needed', 'last chance'],
    landingPage: {
      url: CHINA_TOUR_PAGE,
      checks: { factsConfirmed: true, leadFiresOnce: false, sourceCaptured: true, reachesSales: true },
      status: 'not_ready',
    },
    factorySupportsIdempotency: false,
    checkpointEveryDays: 14,
    events: [
      ev(at(-16, '11:00'), DECIDER, 'pre-approved scope signed'),
      ev(at(-10, '14:30'), PM, 'landing page check off', 'Lead fires once → off (E-03)'),
    ],
  };
}

export function opsSeed(): OpsStatus {
  return {
    tracking: { ga4: true, gtm: true, metaPixel: true, utmCaptured: true, crmConnected: true },
    lastTestEnquiry: { at: at(-6, '08:10'), responseMinutes: 26 * 60 + 2 },
    hoursThisWeek: 9.5,
    hoursCap: 16,
  };
}
