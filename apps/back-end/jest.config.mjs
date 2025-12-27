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
  testMatch: [
    '**/tests/unit/**/*.unit.test.ts',
    '**/tests/integration/**/*.int.test.ts',
    '**/tests/contract/**/*.contract.test.ts',
    '**/__tests__/**/*.test.ts',
  ],
  cache: false,
};
