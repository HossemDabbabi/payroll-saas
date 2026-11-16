/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  coverageDirectory: '../reports/backend/coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',      // entry point — integration test via supertest
    '!src/config/database.js', // DB connection requires live Mongo
    '!src/scripts/**',
  ],
  reporters: [
    'default',
  ],
  testTimeout: 10000,
};
