import type { NextFunction, Request, Response } from 'express'
import { AUTH_COOKIE, verifyToken } from '../lib/auth-token.js'
import { HttpError } from '../lib/http-error.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

function readUserId(req: Request): string | null {
  const token: unknown = req.cookies?.[AUTH_COOKIE]
  return typeof token === 'string' && token ? verifyToken(token) : null
}

/** Attaches `req.userId` when a valid session cookie is present. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = readUserId(req) ?? undefined
  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = readUserId(req)
  if (!userId) return next(HttpError.unauthorized())
  req.userId = userId
  next()
}

/** Narrows `req.userId` inside handlers mounted behind `requireAuth`. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw HttpError.unauthorized()
  return req.userId
}
