import type { CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { env, isProduction } from '../config/env.js'

export const AUTH_COOKIE = 'ms_token'

interface TokenPayload {
  sub: string
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}
