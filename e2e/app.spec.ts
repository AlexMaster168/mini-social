import { expect, test } from '@playwright/test'
import { DEMO_USER, login } from './helpers'

test('guests are redirected to the login page', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)notifications/)
  await expect(page.getByRole('heading', { name: /С возвращением/ })).toBeVisible()
})

test('shows a validation error for wrong credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail или логин').fill(DEMO_USER.login)
  await page.getByLabel('Пароль').fill('wrong-password')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('alert')).toHaveText('Неверный логин или пароль')
})

test('a new user can register, post, like, edit and delete', async ({ page }) => {
  const username = `e2e_${Date.now()}`
  await page.goto('/register')
  await page.getByLabel('Имя').fill('E2E Tester')
  await page.getByLabel('Логин').fill(username)
  await page.getByLabel('E-mail').fill(`${username}@example.com`)
  await page.getByLabel('Пароль', { exact: true }).fill('password123')
  await page.getByLabel('Повтори пароль').fill('password123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  await expect(page.getByRole('heading', { name: 'Лента' })).toBeVisible()

  const text = `Мой первый пост ${Date.now()}`
  await page.getByTestId('composer').fill(text)
  await page.getByRole('button', { name: 'Опубликовать' }).click()

  // The new post goes to the top. Don't filter by text: it moves into a textarea while editing.
  const post = page.getByTestId('post').first()
  await expect(post).toContainText(text)

  await post.getByTestId('like').click()
  await expect(post.getByTestId('like')).toHaveAttribute('aria-pressed', 'true')
  await expect(post.getByTestId('like')).toContainText('1')

  await post.getByRole('button', { name: 'Редактировать' }).click()
  await post.getByRole('textbox').fill(`${text} (изменён)`)
  await post.getByRole('button', { name: 'Сохранить' }).click()
  await expect(post).toContainText('(изменён)')

  await post.getByRole('button', { name: 'Удалить' }).click()
  await post.getByTestId('confirm-delete').click()
  await expect(page.getByTestId('post').filter({ hasText: text })).toHaveCount(0)
})

test('follow a user and exchange messages', async ({ page }) => {
  await login(page)

  await page.goto('/people')
  await page.getByTestId('people-search').fill('olga')
  const row = page.getByRole('main').getByRole('link', { name: /Ольга Литвин/ })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Подписаться' }).click()
  await expect(row.getByRole('button', { name: /Вы подписаны|Отписаться/ })).toBeVisible()

  await row.click()
  await expect(page).toHaveURL(/\/u\/olga/)
  await expect(page.getByTestId('followers-count')).toContainText('1')

  await page.getByRole('link', { name: 'Написать сообщение' }).click()
  await page.getByTestId('message-input').fill('Привет из e2e!')
  await page.getByRole('button', { name: 'Отправить' }).click()
  await expect(page.locator('.bubble.mine').last()).toContainText('Привет из e2e!')
  await expect(page.getByRole('link', { name: /Ольга Литвин.*Вы: Привет из e2e!/ })).toBeVisible()
})

test('notifications page lists likes and follows', async ({ page }) => {
  await login(page)
  await page.getByTestId('nav-Уведомления').click()
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  await expect(page.getByText('подписался(-ась) на тебя').first()).toBeVisible()
  await expect(page.getByText('оценил(а) твой пост').first()).toBeVisible()
})

test('unknown routes show the 404 page', async ({ page }) => {
  await login(page)
  await page.goto('/definitely/not/here')
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
})
