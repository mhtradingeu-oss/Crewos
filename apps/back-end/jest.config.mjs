export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    // Map .js imports to .ts for ESM/TypeScript
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/dist',
    '<rootDir>/.*/__mocks__',
  ],
  // Exclude contract tests from default local runs
  testMatch: [
    '**/tests/unit/**/*.unit.test.ts',
    '**/tests/unit/**/*.unit.test.mts',
    '**/tests/integration/**/*.int.test.ts',
    // '**/tests/contract/**/*.contract.test.ts', // Only run with test:contract
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.mts',
  ],
  cache: false,
};
