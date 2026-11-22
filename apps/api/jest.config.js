/**
 * Jest configuration for the API workspace.
 *
 * Only pure logic is unit tested here (calendar classification, approval
 * workflow table, gate-pass overdue rules). Anything that needs MongoDB is
 * covered by manual/integration verification, not this suite.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    '!src/**/*.d.ts',
  ],
};