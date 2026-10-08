import { expect, test, type Page } from '@playwright/test'
import { login } from './helpers'

const DIR = 'docs/screenshots'

async function shot(page: Page, name: string) {
  // Let fonts, avatars and transitions settle.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${DIR}/${name}.png` })
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((value) => {
    localStorage.setItem('mini-social:theme', value)
    document.documentElement.dataset.theme = value
  }, theme)
}

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

test('capture README screenshots', async ({ page }) => {
  await page.goto('/login')
  await setTheme(page, 'light')
  await shot(page, 'login')

  await page.goto('/register')
  await shot(page, 'register')

  await login(page)
  await expect(page.getByTestId('post').first()).toBeVisible()
  await shot(page, 'feed')

  await page.goto('/u/alexmaster')
  await expect(page.getByTestId('post').first()).toBeVisible()
  await shot(page, 'profile')

  await page.goto('/people')
  await expect(page.getByRole('link', { name: /Вова Котов/ })).toBeVisible()
  await shot(page, 'people')

  await page.goto('/notifications')
  await expect(page.getByText('подписался(-ась) на тебя').first()).toBeVisible()
  await shot(page, 'notifications')

  await page.goto('/messages')
  await page.getByRole('link', { name: /Вова Котов/ }).click()
  await expect(page.locator('.bubble').first()).toBeVisible()
  await shot(page, 'messages')

  await page.goto('/settings')
  await shot(page, 'settings')

  await setTheme(page, 'dark')
  await page.goto('/')
  await expect(page.getByTestId('post').first()).toBeVisible()
  await shot(page, 'feed-dark')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('post').first()).toBeVisible()
  await shot(page, 'mobile-dark')

  await setTheme(page, 'light')
  await page.goto('/u/vova')
  await expect(page.getByRole('heading', { name: /Вова Котов/ }).first()).toBeVisible()
  await shot(page, 'mobile-profile')
})
