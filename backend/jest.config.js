/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
  // Run against the core sources so tests never depend on a stale packages/core/dist.
  moduleNameMapper: { '^@campaign-ops/core$': '<rootDir>/../packages/core/src/index.ts' },
};
