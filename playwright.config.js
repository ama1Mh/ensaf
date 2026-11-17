// Playwright configuration — run with `npm run test:e2e` (or `npm test` for everything).
// Chromium is started with a fake camera so camera prompts never block tests.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
    },
    permissions: ['camera']
  },
  projects: [
    { name: 'laptop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 820, height: 1180 } } }
  ],
  webServer: {
    command: 'node node_modules/http-server/bin/http-server -p 8000 -c-1 -s .',
    url: 'http://localhost:8000/index.html',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
