import { safeHttpUrl } from './url';

describe('safeHttpUrl', () => {
  it('keeps http and https links', () => {
    expect(safeHttpUrl('https://example.com/proof/e-03.png')).toBe(
      'https://example.com/proof/e-03.png',
    );
    expect(safeHttpUrl('http://example.govt.nz/visa')).toBe('http://example.govt.nz/visa');
  });

  it('drops script and other schemes, relative and malformed values', () => {
    for (const bad of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'data:text/html,<b>x</b>',
      'vbscript:x',
      '/relative',
      'not a url',
      '',
      undefined,
    ]) {
      expect([bad, safeHttpUrl(bad)]).toEqual([bad, undefined]);
    }
  });
});
