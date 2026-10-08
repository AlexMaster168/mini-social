/**
 * Fills the database with demo data. Wipes existing data first.
 * All demo accounts use the password `password123`.
 */
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { db, pool } from './client.js'
import { runMigrations } from './migrate.js'
import { follows, messages, notifications, postLikes, posts, users } from './schema.js'

if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  logger.error('Refusing to wipe a production database. Pass --force if you really mean it.')
  process.exit(1)
}

const DEMO_PASSWORD = 'password123'

const people = [
  {
    name: 'Алексей Сильвейструк',
    username: 'alexmaster',
    bio: 'Fullstack. Vue, Node, PostgreSQL.',
    role: 'admin' as const,
  },
  { name: 'Вова Котов', username: 'vova', bio: 'Фронтенд и котики 🐈' },
  { name: 'Мария Иванова', username: 'masha', bio: 'Дизайнер интерфейсов. Люблю чистые сетки.' },
  { name: 'Дмитрий Коваль', username: 'dima_k', bio: 'Бэкенд, Go, распределённые системы.' },
  { name: 'Ольга Литвин', username: 'olga', bio: 'QA и автоматизация тестирования.' },
  { name: 'Сергей Бондарь', username: 'sergey', bio: 'DevOps. Kubernetes, Terraform, кофе.' },
]

const postTexts: [username: string, text: string, minutesAgo: number][] = [
  [
    'alexmaster',
    'Переписал Mini Social на Vue 3 + Express 5 + PostgreSQL. Теперь с тестами, CI и Docker 🚀',
    12,
  ],
  [
    'masha',
    'Новый макет профиля готов. Меньше рамок, больше воздуха — и сразу читается лучше.',
    45,
  ],
  [
    'dima_k',
    'Курсорная пагинация вместо OFFSET — и лента больше не тормозит на тысячах постов.',
    90,
  ],
  ['vova', 'Кто-нибудь уже пробовал Vite 8? Сборка стала заметно быстрее.', 160],
  ['olga', 'Напоминание: тест, который ни разу не падал, ничего не проверяет 🙂', 240],
  ['sergey', 'Healthcheck в Docker + graceful shutdown = деплой без даунтайма.', 380],
  ['alexmaster', 'Добавил мессенджер и уведомления о лайках и подписках.', 600],
  ['masha', 'Тёмная тема — не инверсия цветов. Это отдельная палитра.', 900],
  ['vova', 'Pinia + Composition API — лучшее, что случалось с Vue-стором.', 1300],
  ['dima_k', 'Индексы надо проектировать под запросы, а не под таблицы.', 2000],
]

const followPairs: [follower: string, following: string][] = [
  ['alexmaster', 'vova'],
  ['alexmaster', 'masha'],
  ['alexmaster', 'dima_k'],
  ['vova', 'alexmaster'],
  ['masha', 'alexmaster'],
  ['dima_k', 'alexmaster'],
  ['olga', 'alexmaster'],
  ['sergey', 'alexmaster'],
  ['masha', 'vova'],
  ['olga', 'dima_k'],
  ['sergey', 'dima_k'],
]

const dialog: [from: string, to: string, text: string, minutesAgo: number][] = [
  ['vova', 'alexmaster', 'Привет! Глянул новую версию — огонь 🔥', 30],
  ['alexmaster', 'vova', 'Спасибо, брат! Ещё скрины в README добавлю', 28],
  ['vova', 'alexmaster', 'Давай, жду ссылку на репозиторий', 25],
  ['masha', 'alexmaster', 'Скинула обновлённые иконки в чат', 120],
  ['dima_k', 'alexmaster', 'Когда созвон по API?', 300],
]

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000)

try {
  await runMigrations()
  await db.execute(
    sql`truncate table notifications, messages, post_likes, follows, posts, users restart identity cascade`,
  )

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const inserted = await db
    .insert(users)
    .values(
      people.map((person, index) => ({
        ...person,
        email: `${person.username}@example.com`,
        passwordHash,
        createdAt: minutesAgo(60 * 24 * (30 - index)),
      })),
    )
    .returning({ id: users.id, username: users.username })
  const idOf = (username: string) => inserted.find((u) => u.username === username)!.id

  const createdPosts = await db
    .insert(posts)
    .values(
      postTexts.map(([username, text, ago]) => ({
        authorId: idOf(username),
        text,
        createdAt: minutesAgo(ago),
      })),
    )
    .returning({ id: posts.id, authorId: posts.authorId })

  await db.insert(follows).values(
    followPairs.map(([follower, following], index) => ({
      followerId: idOf(follower),
      followingId: idOf(following),
      createdAt: minutesAgo(100 + index * 7),
    })),
  )

  // Everybody likes a few posts that are not their own.
  const likes = createdPosts.flatMap((post, postIndex) =>
    inserted
      .filter((user, userIndex) => user.id !== post.authorId && (userIndex + postIndex) % 2 === 0)
      .map((user) => ({ postId: post.id, userId: user.id })),
  )
  await db.insert(postLikes).values(likes)

  const me = idOf('alexmaster')
  const likeNotifications = likes
    .filter((like) => createdPosts.find((p) => p.id === like.postId)!.authorId === me)
    .map((like, index) => ({
      userId: me,
      actorId: like.userId,
      type: 'like' as const,
      postId: like.postId,
      createdAt: minutesAgo(5 + index * 11),
    }))
  const followNotifications = followPairs
    .filter(([, following]) => following === 'alexmaster')
    .map(([follower], index) => ({
      userId: me,
      actorId: idOf(follower),
      type: 'follow' as const,
      createdAt: minutesAgo(40 + index * 50),
    }))
  await db.insert(notifications).values([...likeNotifications, ...followNotifications])

  await db.insert(messages).values(
    dialog.map(([from, to, text, ago]) => ({
      senderId: idOf(from),
      recipientId: idOf(to),
      text,
      createdAt: minutesAgo(ago),
      readAt: from === 'vova' && ago === 25 ? null : minutesAgo(ago - 1),
    })),
  )

  logger.info(
    `Seeded ${inserted.length} users, ${createdPosts.length} posts. Log in as alexmaster / ${DEMO_PASSWORD}`,
  )
} catch (error) {
  logger.error(error, 'Seeding failed')
  process.exitCode = 1
} finally {
  await pool.end()
}
