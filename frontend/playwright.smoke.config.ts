import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-smoke',
  timeout: 180000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['line']],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
