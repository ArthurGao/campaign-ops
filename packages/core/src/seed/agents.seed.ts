import type { AuditScope } from '../domain/enums';
import type { EvidenceItem } from '../domain/types';

/** Canned responses for the mock agents (docs/03-agents.md "Mock behaviour"). */

export type AuditCandidate = {
  scope: AuditScope;
  /** Uncertain findings are labelled "unconfirmed" or "ask client" instead of guessed. */
  title: string;
  body: string;
  evidence: Pick<
    EvidenceItem,
    | 'source'
    | 'finding'
    | 'proof'
    | 'impact'
    | 'blocks'
    | 'priority'
    | 'suggestedOwner'
    | 'needsApproval'
  >;
};

export const AUDIT_CANDIDATES: AuditCandidate[] = [
  {
    scope: 'tracking',
    title: 'Lead event fires twice on form submit',
    body: 'GTM preview shows two `Lead` events per submit. Which tag duplicates it is **unconfirmed**.',
    evidence: {
      source: 'tracking',
      finding: 'Lead event fires twice on form submit',
      proof: [
        {
          label: 'GTM preview log — 2 Lead events per submit',
          url: 'https://example.com/proof/e-03-gtm.png',
        },
      ],
      impact: 'Platform-reported conversions roughly double; bidding optimises on bad data',
      blocks: 'ads',
      priority: 'P0',
      suggestedOwner: 'Website developer (ask client)',
      needsApproval: true,
    },
  },
  {
    scope: 'site',
    title: "China Tour page still shows last year's departures",
    body: 'The departure table lists 2026 dates.',
    evidence: {
      source: 'site',
      finding: "China Tour page still shows last year's departures",
      proof: [
        {
          label: 'Page screenshot — 2026 departure table',
          url: 'https://example.com/proof/e-07.png',
        },
      ],
      impact: 'Visitors see wrong dates; cannot send paid traffic to this page',
      blocks: 'traffic',
      priority: 'P0',
      suggestedOwner: 'Website (client)',
      needsApproval: true,
    },
  },
  {
    scope: 'seo',
    title: 'China Tour page has no structured data',
    body: 'No `TouristTrip` or `FAQPage` markup found on the China Tour page.',
    evidence: {
      source: 'seo',
      finding: 'China Tour page has no structured data (TouristTrip / FAQPage)',
      proof: [{ label: 'Rich results test — no items detected' }],
      impact: 'Search engines and AI answers get less structured information about the tour',
      blocks: 'none',
      priority: 'P2',
      suggestedOwner: 'Website developer (client)',
      needsApproval: true,
    },
  },
  {
    scope: 'channels',
    title: 'Business profile lists an old phone number',
    body: 'The map listing shows a phone number that differs from the website footer. Which one is current: **ask client**.',
    evidence: {
      source: 'channels',
      finding:
        'Business profile phone number differs from the website (ask client which is current)',
      proof: [{ label: 'Listing screenshot vs site footer' }],
      impact: 'Phone enquiries may go to an unmonitored line',
      blocks: 'none',
      priority: 'P1',
      suggestedOwner: 'Ask client',
      needsApproval: false,
    },
  },
  {
    scope: 'tracking',
    title: 'Meta Pixel owned by another Business Manager',
    body: 'Pixel dataset belongs to an unrecognised business ID. Ownership: **ask client** — not guessed.',
    evidence: {
      source: 'tracking',
      finding:
        'Meta Pixel is installed but owned by another Business Manager — ownership unknown, ask client',
      proof: [{ label: 'Pixel helper: dataset owned by an unrecognised business ID' }],
      impact: 'Cannot confirm who controls conversion data or audiences',
      blocks: 'none',
      priority: 'P1',
      suggestedOwner: 'Ask client',
      needsApproval: true,
    },
  },
  {
    scope: 'site',
    title: 'Enquiry form has no marketing consent checkbox',
    body: 'The form collects email and phone with no opt-in for follow-up marketing.',
    evidence: {
      source: 'site',
      finding: 'Enquiry form has no marketing consent checkbox',
      proof: [{ label: 'Form screenshot — no consent field' }],
      impact: 'Leads cannot be added to email follow-up without consent',
      blocks: 'none',
      priority: 'P1',
      suggestedOwner: 'Website (client)',
      needsApproval: true,
    },
  },
  {
    scope: 'channels',
    title: 'Instagram bio still links to the 2026 tour page',
    body: 'Bio link points at a sold-out page.',
    evidence: {
      source: 'channels',
      finding: 'Instagram bio still links to the 2026 tour page',
      proof: [{ label: 'Profile screenshot', url: 'https://example.com/proof/e-04.png' }],
      impact: 'Profile visitors land on a sold-out page',
      blocks: 'none',
      priority: 'P1',
      suggestedOwner: 'Executor',
      needsApproval: false,
    },
  },
  {
    scope: 'sales',
    title: 'Approved test enquiry answered after 26 hours',
    body: 'One approved TEST enquiry was sent; first human reply came 26 h later.',
    evidence: {
      source: 'sales',
      finding: 'Approved test enquiry was answered after 26 hours',
      proof: [{ label: 'Test enquiry sent 08:10, first reply 10:12 next day' }],
      impact: 'Paid leads may go cold before first contact',
      blocks: 'none',
      priority: 'P1',
      suggestedOwner: 'Sales lead (client)',
      needsApproval: false,
    },
  },
];

export const GEO_PLATFORMS = ['AI search platform A', 'AI search platform B'] as const;

/** 5 questions × 2 platforms × 2 runs = 20 observations, summarised per question. */
export const GEO_QUESTIONS: {
  question: string;
  results: { platform: string; mentioned: boolean; accurate: boolean | null; cited: string }[];
}[] = [
  {
    question: 'Is there a guided China tour from Auckland?',
    results: [
      {
        platform: GEO_PLATFORMS[0],
        mentioned: false,
        accurate: null,
        cited: 'overseas aggregator',
      },
      {
        platform: GEO_PLATFORMS[1],
        mentioned: false,
        accurate: null,
        cited: 'overseas aggregator',
      },
    ],
  },
  {
    question: 'Best time to visit China from New Zealand',
    results: [
      { platform: GEO_PLATFORMS[0], mentioned: false, accurate: null, cited: 'travel forum' },
      {
        platform: GEO_PLATFORMS[1],
        mentioned: false,
        accurate: null,
        cited: 'government travel advice',
      },
    ],
  },
  {
    question: 'Small group tours to China for over-50s from NZ',
    results: [
      { platform: GEO_PLATFORMS[0], mentioned: true, accurate: false, cited: 'old 2026 tour page' },
      {
        platform: GEO_PLATFORMS[1],
        mentioned: false,
        accurate: null,
        cited: 'overseas aggregator',
      },
    ],
  },
  {
    question: "What's included in a China tour package from NZ?",
    results: [
      {
        platform: GEO_PLATFORMS[0],
        mentioned: false,
        accurate: null,
        cited: 'airline holidays page',
      },
      { platform: GEO_PLATFORMS[1], mentioned: false, accurate: null, cited: 'travel forum' },
    ],
  },
  {
    question: 'Do NZ passport holders need a visa for China?',
    results: [
      {
        platform: GEO_PLATFORMS[0],
        mentioned: false,
        accurate: null,
        cited: 'government travel advice',
      },
      { platform: GEO_PLATFORMS[1], mentioned: false, accurate: null, cited: 'news article' },
    ],
  },
];

/** Defaults for a new video brief prefilled from a task. */
export const BRIEF_DEFAULTS = {
  marketLanguage: 'NZ English market; deliver in English; follow client brand guide',
  forbidden: [
    'Prices or price ranges',
    'Departure dates',
    'Visa or passport claims',
    'Real customer faces or names',
  ],
  requirements: [
    'Burned-in captions',
    'Logo end card with URL in safe area',
    'Licensed music with proof',
    'No AI-generated people',
  ],
  costCap: { maxRerenders: 1, maxCredits: 10 },
  deadlineDays: 7,
};

/** Ratio → default delivery channel for a new brief. */
export const RATIO_CHANNELS: Record<string, string> = {
  '4:5': 'facebook_feed',
  '9:16': 'instagram_reels',
  '16:9': 'youtube_video',
  '1:1': 'facebook_feed',
};

export const GUARDRAIL =
  'Read-only. Produces drafts and suggestions only. A person accepts each item.';

export const AGENT_PROFILES = {
  audit: {
    name: 'Audit',
    role: 'Looks at what is actually there: site, tracking, channels, SEO, GEO baseline. Reports evidence, never fixes.',
    reads: [
      'Public pages',
      'Client-authorised read-only tracking data',
      'One approved test enquiry',
    ],
    permissions: [
      'Read-only',
      'No contact with third parties',
      'Marks ownership questions "ask client"',
    ],
  },
  outbound: {
    name: 'Outbound',
    role: 'Everything that goes out, before it goes out: drafts, fact checks, receipt QA, post-publish verification.',
    reads: [
      'Fact Sheet — external page only',
      'Brand rules and channel specs',
      'Prohibited words',
      'Factory receipts',
      'Live posts (verify)',
    ],
    permissions: [
      'Read-only',
      'Cannot edit UTM links',
      'Cannot publish, schedule or send briefs',
      'Stops with needs_confirmation on unconfirmed facts',
    ],
  },
  feedback: {
    name: 'Feedback',
    role: 'What came back: spend, traffic, leads, reconciliation, anomalies and suggestions. Runs twice a week.',
    reads: [
      'Ad platform reports',
      'GA4 report',
      'De-identified CRM export',
      'Publish and change logs',
      'Fact Sheet internal page (targets)',
    ],
    permissions: [
      'Read-only',
      'Never changes ads, budgets or content',
      'Flags suggestions outside the pre-approved scope',
    ],
  },
} as const;
