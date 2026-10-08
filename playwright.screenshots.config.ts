import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/** Regenerates the README screenshots in docs/screenshots. */
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: '**/screenshots.spec.ts',
  retries: 0,
  reporter: 'list',
})
