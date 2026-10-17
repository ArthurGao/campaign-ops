import { SEED_NOW, catchAppError, find, freshSeed } from '../../testing/fixtures';
import {
  assertConfirmable,
  bumpFactSheetVersion,
  externalOnly,
  isExpiringSoon,
  isPubliclyUsable,
  needsConfirmation,
  unusableRefs,
} from './facts';

const DAY = 86_400_000;

describe('facts rules', () => {
  const seed = freshSeed();
  const fact = (id: string) => find(seed.facts, id);

  describe('isPubliclyUsable', () => {
    it('is true only for external confirmed, or confirmed-with-expiry before expiry', () => {
      expect(isPubliclyUsable(fact('FS-07'), SEED_NOW)).toBe(true);
      expect(isPubliclyUsable(fact('FS-09'), SEED_NOW)).toBe(true);
      for (const id of ['FS-03', 'FS-04', 'FS-12', 'FS-15']) {
        expect([id, isPubliclyUsable(fact(id), SEED_NOW)]).toEqual([id, false]);
      }
    });

    it('expires FS-09 exactly at its expiry instant', () => {
      const expiry = new Date(fact('FS-09').expiresAt!);
      expect(isPubliclyUsable(fact('FS-09'), new Date(expiry.getTime() - 1))).toBe(true);
      expect(isPubliclyUsable(fact('FS-09'), expiry)).toBe(false);
    });

    it('is never true for internal entries, even confirmed ones', () => {
      const internal = { ...fact('FS-20'), status: 'confirmed' as const };
      expect(isPubliclyUsable(internal, SEED_NOW)).toBe(false);
    });
  });

  it('flags confirmed-with-expiry within 45 days as expiring soon', () => {
    expect(isExpiringSoon(fact('FS-09'), SEED_NOW)).toBe(true);
    expect(isExpiringSoon(fact('FS-09'), new Date(SEED_NOW.getTime() - 20 * DAY))).toBe(false);
    expect(isExpiringSoon(fact('FS-07'), SEED_NOW)).toBe(false);
  });

  it('lists unusable refs: pending, unknown ids and internal entries', () => {
    expect(unusableRefs(['FS-07', 'FS-04', 'FS-99', 'FS-20'], seed.facts, SEED_NOW)).toEqual(['FS-04', 'FS-99', 'FS-20']);
    expect(needsConfirmation(['FS-07', 'FS-11'], seed.facts, SEED_NOW)).toBe(false);
    expect(needsConfirmation(['FS-07', 'FS-04'], seed.facts, SEED_NOW)).toBe(true);
  });

  it('I-F1: the external view never contains internal entries', () => {
    const ext = externalOnly(seed.facts);
    expect(ext.length).toBeGreaterThan(0);
    expect(ext.filter((f) => f.page === 'internal')).toEqual([]);
  });

  it('bumps the minor Fact Sheet version', () => {
    expect(bumpFactSheetVersion('FS-v1.3')).toBe('FS-v1.4');
    expect(bumpFactSheetVersion('FS-v2.9')).toBe('FS-v2.10');
  });

  describe('assertConfirmable', () => {
    it('requires a source (409)', () => {
      const err = catchAppError(() => assertConfirmable(fact('FS-04'), '  '));
      expect({ code: err.code, status: err.status }).toEqual({ code: 'VALIDATION', status: 409 });
    });

    it('refuses superseded entries', () => {
      expect(catchAppError(() => assertConfirmable(fact('FS-03'), 'Email')).code).toBe('INVALID_TRANSITION');
    });

    it('accepts a pending entry with a source', () => {
      expect(() => assertConfirmable(fact('FS-04'), 'Client email 16 Oct')).not.toThrow();
    });
  });
});
