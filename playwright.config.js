// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // More than 2 parallel browsers overloads the tutor's PC and causes timeouts (66/66 pass with 2).
  workers: process.env.CI ? undefined : 2,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/` },
  webServer: {
    command: `node tools/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true } },
  ],
});
