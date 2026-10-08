import { expect, type Page } from '@playwright/test'

export const DEMO_USER = {
  login: 'alexmaster',
  password: 'password123',
  name: 'Алексей Сильвейструк',
}

export async function login(page: Page, user: { login: string; password: string } = DEMO_USER) {
  await page.goto('/login')
  await page.getByLabel('E-mail или логин').fill(user.login)
  await page.getByLabel('Пароль').fill(user.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('heading', { name: 'Лента' })).toBeVisible()
}
