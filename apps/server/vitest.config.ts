import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    // Integration tests share one database, so run files sequentially.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgres://postgres:alexalex@localhost:5432/mini_social_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
      LOG_LEVEL: 'silent',
    },
  },
})
