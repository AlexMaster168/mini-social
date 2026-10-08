import bcrypt from 'bcryptjs'
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { follows, notifications, users } from '../../db/schema.js'
import { AUTH_COOKIE, authCookieOptions } from '../../lib/auth-token.js'
import { HttpError } from '../../lib/http-error.js'
import { parse, uuidParam } from '../../lib/validate.js'
import { currentUserId, requireAuth } from '../../middleware/auth.js'
import { BCRYPT_ROUNDS, findMe } from '../auth/auth.routes.js'
import { bioField, emailField, nameField, passwordField, usernameField } from './user-fields.js'
import {
  followersCountSql,
  isFollowingSql,
  profileColumns,
  userCardColumns,
} from './user-queries.js'

const SearchQuery = z.object({
  q: z.string().trim().max(60).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

const UpdateMeBody = z
  .object({
    name: nameField,
    username: usernameField,
    email: emailField,
    bio: bioField,
  })
  .partial()

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль').max(72),
  newPassword: passwordField,
})

const DeleteMeBody = z.object({ password: z.string().min(1, 'Введите пароль').max(72) })

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

async function assertUserExists(id: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id))
  if (!user) throw HttpError.notFound('Пользователь не найден')
}

async function verifyPassword(userId: string, password: string) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw HttpError.badRequest('Неверный пароль')
  }
}

export const usersRouter = Router()
usersRouter.use(requireAuth)

usersRouter.get('/', async (req, res) => {
  const me = currentUserId(req)
  const { q, limit } = parse(SearchQuery, req.query)
  const pattern = `%${escapeLike(q)}%`

  const items = await db
    .select(userCardColumns(me))
    .from(users)
    .where(q ? or(ilike(users.name, pattern), ilike(users.username, pattern)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)

  res.json({ items })
})

usersRouter.get('/suggestions', async (req, res) => {
  const me = currentUserId(req)
  const items = await db
    .select(userCardColumns(me))
    .from(users)
    .where(and(ne(users.id, me), sql`not ${isFollowingSql(me)}`))
    .orderBy(desc(followersCountSql()), desc(users.createdAt))
    .limit(5)

  res.json({ items })
})

usersRouter.patch('/me', async (req, res) => {
  const me = currentUserId(req)
  const body = parse(UpdateMeBody, req.body)

  if (body.username || body.email) {
    const [taken] = await db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(
        and(
          ne(users.id, me),
          or(
            body.username ? sql`lower(${users.username}) = lower(${body.username})` : undefined,
            body.email ? sql`lower(${users.email}) = lower(${body.email})` : undefined,
          ),
        ),
      )
      .limit(1)
    if (taken) {
      throw HttpError.conflict(
        body.email && taken.email.toLowerCase() === body.email
          ? 'Этот e-mail уже занят'
          : 'Этот логин уже занят',
      )
    }
  }

  if (Object.keys(body).length > 0) {
    await db.update(users).set(body).where(eq(users.id, me))
  }
  res.json({ user: await findMe(me) })
})

usersRouter.put('/me/password', async (req, res) => {
  const me = currentUserId(req)
  const { currentPassword, newPassword } = parse(ChangePasswordBody, req.body)
  await verifyPassword(me, currentPassword)

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await db.update(users).set({ passwordHash }).where(eq(users.id, me))
  res.status(204).end()
})

usersRouter.delete('/me', async (req, res) => {
  const me = currentUserId(req)
  const { password } = parse(DeleteMeBody, req.body)
  await verifyPassword(me, password)

  await db.delete(users).where(eq(users.id, me))
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined })
  res.status(204).end()
})

usersRouter.get('/by-username/:username', async (req, res) => {
  const me = currentUserId(req)
  const username = String(req.params.username)

  const [profile] = await db
    .select(profileColumns(me))
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
  if (!profile) throw HttpError.notFound('Пользователь не найден')

  res.json({ user: profile })
})

usersRouter.get('/:id/followers', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)
  await assertUserExists(id)

  const items = await db
    .select(userCardColumns(me))
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followerId))
    .where(eq(follows.followingId, id))
    .orderBy(desc(follows.createdAt))

  res.json({ items })
})

usersRouter.get('/:id/following', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)
  await assertUserExists(id)

  const items = await db
    .select(userCardColumns(me))
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followingId))
    .where(eq(follows.followerId, id))
    .orderBy(desc(follows.createdAt))

  res.json({ items })
})

usersRouter.post('/:id/follow', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)
  if (id === me) throw HttpError.badRequest('Нельзя подписаться на самого себя')
  await assertUserExists(id)

  const inserted = await db
    .insert(follows)
    .values({ followerId: me, followingId: id })
    .onConflictDoNothing()
    .returning({ followerId: follows.followerId })

  if (inserted.length > 0) {
    await db.insert(notifications).values({ userId: id, actorId: me, type: 'follow' })
  }
  res.status(204).end()
})

usersRouter.delete('/:id/follow', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)

  await db.transaction(async (tx) => {
    await tx.delete(follows).where(and(eq(follows.followerId, me), eq(follows.followingId, id)))
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, id),
          eq(notifications.actorId, me),
          eq(notifications.type, 'follow'),
        ),
      )
  })
  res.status(204).end()
})
