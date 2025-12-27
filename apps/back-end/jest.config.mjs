export default {
  testEnvironment: 'node',

  // 👇 مهم: هذا يجعل Jest ESM حقيقي
  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.jest.json',
      },
    ],
  },

  moduleNameMapper: {
    // 👇 يمنع Jest من طلب .js يدويًا
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  modulePathIgnorePatterns: [
    '<rootDir>/dist',
  ],

  testMatch: ['**/__tests__/**/*.test.ts'],

  cache: false,
};
