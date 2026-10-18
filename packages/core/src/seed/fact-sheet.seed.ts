import type { FactEntry, FactSheetVersion } from '../domain/types';
import { APPROVER, DECIDER, PM } from './actors';
import { at, ev, tracked } from './time';

const VISA_SOURCE = 'https://example.govt.nz/visa';

export const FACT_SHEET_VERSION = 'FS-v1.3';

export function factSheetSeed(): FactEntry[] {
  return [
    // ---- external page: the only entries outbound content may cite
    {
      id: 'FS-01',
      page: 'external',
      label: 'Tour name',
      statement: 'China Tour 2027 — a guided small-group tour from New Zealand',
      status: 'confirmed',
      source: 'Client product sheet v2 (PDF)',
      confirmedBy: APPROVER,
      confirmedAt: at(-20),
      ...tracked(at(-21), [
        ev(at(-21), PM, 'created'),
        ev(at(-20), APPROVER, 'confirmed', 'Source: Client product sheet v2 (PDF)'),
      ]),
    },
    {
      id: 'FS-03',
      page: 'external',
      label: 'Departure (old)',
      statement: 'Departure: April 2027 [date TBC]',
      status: 'superseded',
      supersededBy: 'FS-04',
      ...tracked(at(-21), [
        ev(at(-21), PM, 'created'),
        ev(at(-9), PM, 'superseded', 'Replaced by FS-04 after the client moved the window'),
      ]),
    },
    {
      id: 'FS-04',
      page: 'external',
      label: 'Departure',
      productCore: true,
      statement: 'Departure: March 2027 [date TBC]',
      status: 'pending',
      ...tracked(at(-9), [
        ev(at(-9), PM, 'created', 'Client indicated March; awaiting written confirmation'),
      ]),
    },
    {
      id: 'FS-07',
      page: 'external',
      label: 'Itinerary cities',
      statement: "Itinerary cities: Beijing, Xi'an, Guilin, Shanghai",
      status: 'confirmed',
      source: 'Client itinerary draft v3 (DOCX)',
      confirmedBy: APPROVER,
      confirmedAt: at(-14),
      ...tracked(at(-21), [
        ev(at(-21), PM, 'created'),
        ev(at(-14), APPROVER, 'confirmed', 'Source: Client itinerary draft v3 (DOCX)'),
      ]),
    },
    {
      id: 'FS-09',
      page: 'external',
      label: 'Entry requirements (NZ passport)',
      official: true,
      statement:
        'Entry requirements for NZ passport holders: [visa rule TBC — see official source]',
      status: 'confirmed_with_expiry',
      source: VISA_SOURCE,
      confirmedBy: APPROVER,
      confirmedAt: at(-5),
      expiresAt: at(30),
      publicNote: 'Must state: subject to official information at departure',
      ...tracked(at(-21), [
        ev(at(-21), PM, 'created'),
        ev(at(-5), APPROVER, 'confirmed_with_expiry', `Source: ${VISA_SOURCE}; expires in 30 days`),
      ]),
    },
    {
      id: 'FS-11',
      page: 'external',
      label: 'Inclusions',
      productCore: true,
      statement:
        'Inclusions: return flights from Auckland, hotels, English-speaking guide, most meals [details TBC]',
      status: 'confirmed',
      source: 'Client product sheet v2 (PDF)',
      confirmedBy: APPROVER,
      confirmedAt: at(-20),
      ...tracked(at(-21), [
        ev(at(-21), PM, 'created'),
        ev(at(-20), APPROVER, 'confirmed', 'Source: Client product sheet v2 (PDF)'),
      ]),
    },
    {
      id: 'FS-12',
      page: 'external',
      label: 'Primary customer',
      statement: 'Primary customers: NZ residents aged 50+, travelling as a couple or small group',
      status: 'assumption',
      publicNote: 'Assumption to validate with CRM data; never state publicly',
      ...tracked(at(-21), [ev(at(-21), PM, 'created', 'From kickoff notes; not validated')]),
    },
    {
      id: 'FS-15',
      page: 'external',
      label: 'Price',
      productCore: true,
      statement: 'Price per person: [price TBC]',
      status: 'pending',
      ...tracked(at(-21), [ev(at(-21), PM, 'created', 'Client pricing not final')]),
    },
    {
      id: 'FS-16',
      page: 'external',
      label: 'Seats',
      productCore: true,
      statement: 'Seats available: [seats TBC]',
      status: 'pending',
      ...tracked(at(-21), [ev(at(-21), PM, 'created', 'Group size not final')]),
    },
    // ---- internal page: never exposed to the Outbound agent, never cited publicly
    {
      id: 'FS-20',
      page: 'internal',
      label: 'Ad budget',
      statement: 'Ad budget for the promotion window: [budget TBC]',
      status: 'pending',
      purpose: 'Cap on paid spend across channels',
      ...tracked(at(-21), [ev(at(-21), PM, 'created')]),
    },
    {
      id: 'FS-21',
      page: 'internal',
      label: 'Sales target',
      statement: 'Sales target: [N] seats',
      status: 'assumption',
      purpose: 'Cap on how many leads to buy',
      ...tracked(at(-21), [ev(at(-21), PM, 'created')]),
    },
    {
      id: 'FS-22',
      page: 'internal',
      label: 'Sales capacity',
      statement: 'Sales can handle [n] enquiries per week',
      status: 'pending',
      purpose: 'Pace of lead volume',
      ...tracked(at(-21), [ev(at(-21), PM, 'created')]),
    },
    {
      id: 'FS-23',
      page: 'internal',
      label: 'Close rate',
      statement: 'Close rate: [r] of valid leads book',
      status: 'assumption',
      purpose: 'Estimate leads needed per seat',
      ...tracked(at(-21), [ev(at(-21), DECIDER, 'created')]),
    },
    {
      id: 'FS-24',
      page: 'internal',
      label: 'People per booking',
      statement: 'People per booking: [p]',
      status: 'assumption',
      purpose: 'Convert seats to bookings',
      ...tracked(at(-21), [ev(at(-21), DECIDER, 'created')]),
    },
  ];
}

export function factSheetVersionsSeed(): FactSheetVersion[] {
  return [
    {
      version: 'FS-v1.0',
      at: at(-21),
      actor: PM,
      changes: [
        'FS-01',
        'FS-03',
        'FS-07',
        'FS-09',
        'FS-11',
        'FS-12',
        'FS-15',
        'FS-16',
        'FS-20',
        'FS-21',
        'FS-22',
        'FS-23',
        'FS-24',
      ].map((factId) => ({
        factId,
        after: {
          status:
            factId === 'FS-12' || factId === 'FS-21' || factId === 'FS-23' || factId === 'FS-24'
              ? 'assumption'
              : 'pending',
        },
      })),
      affected: [],
    },
    {
      version: 'FS-v1.1',
      at: at(-14),
      actor: APPROVER,
      changes: [
        {
          factId: 'FS-01',
          before: { status: 'pending' },
          after: { status: 'confirmed', source: 'Client product sheet v2 (PDF)' },
        },
        {
          factId: 'FS-07',
          before: { status: 'pending' },
          after: { status: 'confirmed', source: 'Client itinerary draft v3 (DOCX)' },
        },
        {
          factId: 'FS-11',
          before: { status: 'pending' },
          after: { status: 'confirmed', source: 'Client product sheet v2 (PDF)' },
        },
      ],
      affected: [],
    },
    {
      version: 'FS-v1.2',
      at: at(-9),
      actor: PM,
      changes: [
        {
          factId: 'FS-03',
          before: { status: 'pending', statement: 'Departure: April 2027 [date TBC]' },
          after: { status: 'superseded', supersededBy: 'FS-04' },
        },
        {
          factId: 'FS-04',
          after: { status: 'pending', statement: 'Departure: March 2027 [date TBC]' },
        },
      ],
      affected: [{ kind: 'task', id: 'TASK-021' }],
    },
    {
      version: 'FS-v1.3',
      at: at(-5),
      actor: APPROVER,
      changes: [
        {
          factId: 'FS-09',
          before: { status: 'pending' },
          after: { status: 'confirmed_with_expiry', source: VISA_SOURCE, expiresAt: at(30) },
        },
      ],
      affected: [],
    },
  ];
}
