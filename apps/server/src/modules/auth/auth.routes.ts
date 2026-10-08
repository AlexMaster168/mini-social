import bcrypt from 'bcryptjs'
import { eq, or, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { db } from '../../db/client.js'
import { users } from '../../db/schema.js'
import { AUTH_COOKIE, authCookieOptions, signToken } from '../../lib/auth-token.js'
import { HttpError } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import { currentUserId, requireAuth } from '../../middleware/auth.js'
import {
  emailField,
  meColumns,
  nameField,
  passwordField,
  usernameField,
} from '../users/user-fields.js'

// Cheap hashing in tests keeps the suite fast; 12 rounds everywhere else.
export const BCRYPT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 12

const RegisterBody = z.object({
  name: nameField,
  username: usernameField,
  email: emailField,
  password: passwordField,
})

const LoginBody = z.object({
  // Accepts either e-mail or username.
  login: z.string().trim().min(1, 'Введите e-mail или логин').max(254),
  password: z.string().min(1, 'Введите пароль').max(72),
})

export async function findMe(userId: string) {
  const [me] = await db.select(meColumns).from(users).where(eq(users.id, userId))
  return me
}

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const body = parse(RegisterBody, req.body)

  const [taken] = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(
      or(
        sql`lower(${users.username}) = lower(${body.username})`,
        sql`lower(${users.email}) = lower(${body.email})`,
      ),
    )
    .limit(1)
  if (taken) {
    throw HttpError.conflict(
      taken.email.toLowerCase() === body.email ? 'Этот e-mail уже занят' : 'Этот логин уже занят',
    )
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS)
  const [user] = await db
    .insert(users)
    .values({ name: body.name, username: body.username, email: body.email, passwordHash })
    .returning(meColumns)

  res.cookie(AUTH_COOKIE, signToken(user!.id), authCookieOptions)
  res.status(201).json({ user })
})

authRouter.post('/login', async (req, res) => {
  const { login, password } = parse(LoginBody, req.body)

  const [user] = await db
    .select({ ...meColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(
      or(
        sql`lower(${users.email}) = lower(${login})`,
        sql`lower(${users.username}) = lower(${login})`,
      ),
    )
    .limit(1)

  // Same message for both cases so the endpoint does not reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw HttpError.unauthorized('Неверный логин или пароль')
  }

  const { passwordHash: _passwordHash, ...me } = user
  res.cookie(AUTH_COOKIE, signToken(me.id), authCookieOptions)
  res.json({ user: me })
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined })
  res.status(204).end()
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const me = await findMe(currentUserId(req))
  if (!me) {
    res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined })
    throw HttpError.unauthorized()
  }
  res.json({ user: me })
})
