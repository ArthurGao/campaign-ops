import { SEED_NOW, expectCode, find, freshSeed } from '../../testing/fixtures';
import {
  DEIDENTIFIED_COLUMNS,
  applyLeadPatch,
  deidentify,
  historicallyValidCount,
  mergeLeads,
  mergeSuggestions,
  relatedLinks,
  toCsv,
} from './leads';

describe('lead rules', () => {
  const seed = freshSeed();
  const lead = (id: string) => find(seed.leads, id);

  it('I-L2: suggests merging only same contact AND same travel need (newer into older)', () => {
    expect(mergeSuggestions(seed.leads)).toEqual([
      {
        leadId: 'L-0026',
        intoId: 'L-0025',
        matchedOn: ['phone'],
        tour: 'China Tour 2027',
        travelDate: '2027-04',
      },
    ]);
  });

  it('I-L2: same contact with a different travel date is linked, not merged', () => {
    expectCode(() => mergeLeads(lead('L-0017'), lead('L-0016')), 'INVALID_TRANSITION');
    expect(relatedLinks(lead('L-0016'), seed.leads)).toEqual(['L-0017']);
  });

  it('refuses different contacts and already-merged records', () => {
    expectCode(() => mergeLeads(lead('L-0021'), lead('L-0012')), 'INVALID_TRANSITION');
    expectCode(() => mergeLeads(lead('L-0019'), lead('L-0014')), 'INVALID_TRANSITION');
  });

  it('merges, keeping the survivor and filling missing contact fields', () => {
    const [gone, kept] = mergeLeads(lead('L-0026'), lead('L-0025'));
    expect(gone.mergedInto).toBe('L-0025');
    expect(kept.mergedFrom).toEqual(['L-0026']);
    expect(kept.contact.email).toBe('lead.l@example.com');
  });

  it('I-L1: a lead valid once stays historically valid after it is lost', () => {
    const lost = applyLeadPatch(
      lead('L-0021'),
      { stage: 'lost', lostReason: 'Changed plans' },
      SEED_NOW,
    );
    expect(lost.everValid).toBe(true);
    const flipped = applyLeadPatch(
      lost,
      { validity: 'invalid', validityReason: 'Duplicate of a phone enquiry' },
      SEED_NOW,
    );
    expect(flipped).toMatchObject({
      everValid: true,
      validity: { value: 'invalid', decidedAt: SEED_NOW.toISOString() },
    });
    const seededValid = seed.leads.filter((l) => l.everValid && !l.mergedInto).map((l) => l.id);
    expect(seededValid).toEqual(['L-0012', 'L-0014', 'L-0015', 'L-0016', 'L-0021']);
    expect(historicallyValidCount(seed.leads)).toBe(5);
  });

  it('requires reasons for invalid and lost', () => {
    expectCode(
      () => applyLeadPatch(lead('L-0018'), { validity: 'invalid' }, SEED_NOW),
      'VALIDATION',
    );
    expectCode(() => applyLeadPatch(lead('L-0018'), { stage: 'lost' }, SEED_NOW), 'VALIDATION');
  });

  it('I-L3: the de-identified export has no names, emails, phones, click ids or notes', () => {
    const csv = toCsv(seed.leads.map(deidentify));
    expect(csv.split('\n')[0]).toBe(DEIDENTIFIED_COLUMNS.join(','));
    expect(csv).not.toMatch(
      /@example\.com|\+64|Demo Lead|fbclid|gclid|fb\.demo|Travelling as a couple/,
    );
    expect(csv).toContain('L-0012,');
  });
});
