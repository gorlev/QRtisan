import { defineConfig, devices } from '@playwright/test';

const PORT = 5177;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    acceptDownloads: true,
    // Determinist test temeli: sistem dili tr-TR verilir; üretimdeki otomatik
    // seçim böylece tüm mevcut akışlarda Türkçeye karşılık gelir. İngilizce ve
    // desteklenmeyen sistem dilleri kendi testlerinde açıkça ezilir.
    locale: 'tr-TR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
