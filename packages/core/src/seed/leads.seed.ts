import type { Lead } from '../domain/types';
import { PM, SALES } from './actors';
import { at, ev, tracked } from './time';

const TOUR = 'China Tour 2027';
const CAMPAIGN = 'china_tour_2027';

type LeadInit = Omit<
  Lead,
  keyof ReturnType<typeof tracked> | 'owner' | 'clickIds' | 'everValid' | 'adDetail'
> &
  Partial<Pick<Lead, 'owner' | 'clickIds' | 'everValid' | 'adDetail'>> & {
    history?: Lead['events'];
  };

function lead(init: LeadInit): Lead {
  const { history, ...rest } = init;
  return {
    owner: SALES.name,
    clickIds: {},
    everValid: init.validity.value === 'valid',
    adDetail: { resolution: 'unknown' },
    ...rest,
    ...tracked(init.receivedAt, history ?? [ev(init.receivedAt, SALES, 'received')]),
  };
}

const decided = (
  days: number,
  value: Lead['validity']['value'],
  reason?: string,
): Lead['validity'] => ({
  value,
  decidedAt: at(days, '16:00'),
  ...(reason ? { reason } : {}),
});

/** All contacts are fake (example.com, +64 21 000 0xxx). */
export function leadsSeed(): Lead[] {
  return [
    lead({
      id: 'L-0012',
      receivedAt: at(-16, '19:12'),
      contact: {
        name: 'Demo Lead A. (fake)',
        email: 'lead.a@example.com',
        phone: '+64 21 000 0012',
      },
      enquiry: { tour: TOUR, travelDate: '2027-03', people: 2, notes: 'Travelling as a couple' },
      source: {
        utmSource: 'facebook',
        utmMedium: 'paid_social',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Meta ads',
      },
      adDetail: {
        campaignId: 'META-CT27-A',
        adId: 'AD-A-03',
        utmContent: 'ad-a-03',
        landingPageVersion: 'v3',
        resolution: 'captured',
      },
      clickIds: { fbclid: 'fb.demo.0012' },
      firstResponseAt: at(-16, '20:05'),
      validity: decided(-15, 'valid', 'Matches tour and dates'),
      stage: 'deposit_paid',
      order: { tour: TOUR, people: 2 },
      history: [
        ev(at(-16, '19:12'), SALES, 'received'),
        ev(at(-15, '16:00'), SALES, 'validity → valid'),
        ev(at(-9), SALES, 'stage → deposit_paid'),
      ],
    }),
    lead({
      id: 'L-0013',
      receivedAt: at(-15, '10:40'),
      contact: { name: 'Demo Lead B. (fake)', email: 'lead.b@example.com' },
      enquiry: { tour: TOUR, people: 1, notes: 'Asked about travelling without a group' },
      source: { utmSource: 'google', utmMedium: 'organic_search', channelLabel: 'Organic search' },
      firstResponseAt: at(-15, '13:00'),
      validity: decided(-14, 'invalid', 'wants independent travel'),
      stage: 'lost',
      lostReason: 'Not a fit: independent travel',
    }),
    lead({
      id: 'L-0014',
      receivedAt: at(-13, '08:55'),
      contact: {
        name: 'Demo Lead C. (fake)',
        email: 'lead.c@example.com',
        phone: '+64 21 000 0014',
      },
      enquiry: { tour: TOUR, travelDate: '2027-04', people: 4, notes: 'Two couples' },
      source: {
        utmSource: 'google',
        utmMedium: 'paid_search',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Google Search',
      },
      adDetail: {
        campaignId: 'GS-CT27-NB',
        adId: 'AD-GS-01',
        utmTerm: 'guided china tour nz',
        landingPageVersion: 'v3',
        resolution: 'captured',
      },
      clickIds: { gclid: 'gclid.demo.0014' },
      firstResponseAt: at(-13, '09:30'),
      validity: decided(-12, 'valid'),
      stage: 'quoted',
      mergedFrom: ['L-0019'],
      history: [
        ev(at(-13, '08:55'), SALES, 'received'),
        ev(at(-12, '16:00'), SALES, 'validity → valid'),
        ev(at(-12, '16:10'), SALES, 'merged', 'L-0019 (same email, same tour and month)'),
        ev(at(-7), SALES, 'stage → quoted'),
      ],
    }),
    lead({
      id: 'L-0015',
      receivedAt: at(-14, '21:30'),
      contact: { name: 'Demo Lead D. (fake)', email: 'lead.d@example.com' },
      enquiry: { tour: TOUR, travelDate: '2027-05', people: 2 },
      source: {
        utmSource: 'facebook',
        utmMedium: 'paid_social',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Meta ads',
      },
      adDetail: {
        campaignId: 'META-CT27-A',
        adId: 'AD-A-01',
        utmContent: 'ad-a-01',
        landingPageVersion: 'v2',
        resolution: 'captured',
      },
      clickIds: { fbclid: 'fb.demo.0015' },
      firstResponseAt: at(-13, '09:10'),
      validity: decided(-13, 'valid'),
      everValid: true,
      stage: 'lost',
      lostReason: 'Booked with another operator',
      history: [
        ev(at(-14, '21:30'), SALES, 'received'),
        ev(at(-13, '16:00'), SALES, 'validity → valid'),
        ev(at(-4), SALES, 'stage → lost', undefined, 'Booked with another operator'),
      ],
    }),
    lead({
      id: 'L-0016',
      receivedAt: at(-11, '12:15'),
      contact: {
        name: 'Demo Lead E. (fake)',
        email: 'lead.e@example.com',
        phone: '+64 21 000 0016',
      },
      enquiry: { tour: TOUR, travelDate: '2027-03', people: 2, notes: 'For themselves' },
      source: {
        utmSource: 'instagram',
        utmMedium: 'organic_social',
        channelLabel: 'Instagram (organic)',
      },
      firstResponseAt: at(-11, '15:00'),
      validity: decided(-10, 'valid'),
      stage: 'contacted',
      relatedLeadIds: ['L-0017'],
    }),
    lead({
      id: 'L-0017',
      receivedAt: at(-10, '18:40'),
      contact: {
        name: 'Demo Lead E. (fake)',
        email: 'lead.e@example.com',
        phone: '+64 21 000 0016',
      },
      enquiry: {
        tour: TOUR,
        travelDate: '2027-05',
        people: 3,
        notes: 'For their parents — a different trip',
      },
      source: {
        utmSource: 'instagram',
        utmMedium: 'organic_social',
        channelLabel: 'Instagram (organic)',
      },
      firstResponseAt: at(-9, '09:20'),
      validity: { value: 'pending' },
      stage: 'contacted',
      relatedLeadIds: ['L-0016'],
    }),
    lead({
      id: 'L-0018',
      receivedAt: at(-8, '07:50'),
      contact: { name: 'Demo Lead F. (fake)', email: 'lead.f@example.com' },
      enquiry: { tour: TOUR, travelDate: '2027-04', people: 2 },
      source: {
        utmSource: 'facebook',
        utmMedium: 'lead_ads',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Meta lead form',
      },
      adDetail: { campaignId: 'META-CT27-A', adId: 'AD-A-02', resolution: 'matched_from_platform' },
      firstResponseAt: at(-8, '11:00'),
      validity: { value: 'pending' },
      stage: 'new',
    }),
    lead({
      id: 'L-0019',
      receivedAt: at(-13, '09:05'),
      contact: { name: 'Demo Lead C. (fake)', email: 'lead.c@example.com' },
      enquiry: { tour: TOUR, travelDate: '2027-04', people: 4 },
      source: {
        utmSource: 'google',
        utmMedium: 'paid_search',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Google Search',
      },
      adDetail: { campaignId: 'GS-CT27-NB', adId: 'AD-GS-01', resolution: 'captured' },
      validity: { value: 'pending' },
      stage: 'new',
      mergedInto: 'L-0014',
      history: [
        ev(at(-13, '09:05'), SALES, 'received'),
        ev(at(-12, '16:10'), SALES, 'merged into L-0014'),
      ],
    }),
    lead({
      id: 'L-0020',
      receivedAt: at(-6, '11:20'),
      contact: { name: 'Demo Lead G. (fake)', phone: '+64 21 000 0020' },
      enquiry: { tour: TOUR, people: 2, notes: 'Phoned the office' },
      source: { utmMedium: 'phone', channelLabel: 'Phone' },
      adDetail: { resolution: 'unknown' },
      selfReportedSource: 'Saw it on Facebook',
      firstResponseAt: at(-6, '11:20'),
      validity: { value: 'pending' },
      stage: 'new',
    }),
    lead({
      id: 'L-0021',
      receivedAt: at(-5, '20:10'),
      contact: { name: 'Demo Lead H. (fake)', email: 'lead.h@example.com' },
      enquiry: { tour: TOUR, travelDate: '2027-03', people: 2 },
      source: { utmSource: 'instagram', utmMedium: 'dm', channelLabel: 'Instagram DM' },
      firstResponseAt: at(-4, '09:00'),
      validity: decided(-4, 'valid'),
      stage: 'contacted',
    }),
    ...(['L-0022', 'L-0023', 'L-0024'] as const).map((id, i) =>
      lead({
        id,
        receivedAt: at(-9 + i * 2, '13:30'),
        contact: {
          name: `Demo Lead ${['I', 'J', 'K'][i]}. (fake)`,
          email: `lead.${['i', 'j', 'k'][i]}@example.com`,
        },
        enquiry: { tour: TOUR, people: 1, notes: 'Wants to travel independently' },
        source: {
          utmSource: 'facebook',
          utmMedium: 'paid_social',
          utmCampaign: CAMPAIGN,
          channelLabel: 'Meta ads',
        },
        adDetail: {
          campaignId: 'META-CT27-B',
          adId: `AD-B-0${i + 1}`,
          utmContent: `ad-b-0${i + 1}`,
          landingPageVersion: 'v3',
          resolution: 'captured',
        },
        clickIds: { fbclid: `fb.demo.00${22 + i}` },
        firstResponseAt: at(-8 + i * 2, '09:30'),
        validity: decided(-8 + i * 2, 'invalid', 'wants independent travel'),
        stage: 'lost',
        lostReason: 'Not a fit: independent travel',
      }),
    ),
    lead({
      id: 'L-0025',
      receivedAt: at(-2, '09:45'),
      contact: {
        name: 'Demo Lead L. (fake)',
        email: 'lead.l@example.com',
        phone: '+64 21 000 0025',
      },
      enquiry: { tour: TOUR, travelDate: '2027-04', people: 2 },
      source: { utmSource: 'google', utmMedium: 'organic_search', channelLabel: 'Organic search' },
      firstResponseAt: at(-2, '13:00'),
      validity: { value: 'pending' },
      stage: 'new',
    }),
    lead({
      id: 'L-0026',
      receivedAt: at(-1, '19:05'),
      contact: { name: 'Demo Lead L. (fake)', phone: '+64 21 000 0025' },
      enquiry: {
        tour: TOUR,
        travelDate: '2027-04',
        people: 2,
        notes: 'Same enquiry sent again from the lead form',
      },
      source: {
        utmSource: 'facebook',
        utmMedium: 'lead_ads',
        utmCampaign: CAMPAIGN,
        channelLabel: 'Meta lead form',
      },
      adDetail: { campaignId: 'META-CT27-A', adId: 'AD-A-02', resolution: 'matched_from_platform' },
      validity: { value: 'pending' },
      stage: 'new',
      owner: PM.name,
    }),
  ];
}
