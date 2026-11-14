/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/jest.setup.env.js'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coverageDirectory: 'coverage'
};
