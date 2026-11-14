/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/jest.setup.env.js'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/docs/**'],
  coverageDirectory: 'coverage',
  testTimeout: 15000
};
