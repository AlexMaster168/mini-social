import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
export const baseURL = `http://localhost:${PORT}`

/**
 * Runs against the production build: `pnpm build` must have been run first.
 * The server is started on a separate, freshly seeded database.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/screenshots.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node apps/server/dist/db/seed.js && node apps/server/dist/server.js',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        'postgres://postgres:alexalex@localhost:5432/mini_social_e2e',
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
      LOG_LEVEL: 'warn',
    },
  },
})
