import { existsSync } from 'node:fs'
import path from 'node:path'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { sql } from 'drizzle-orm'
import express, { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { db } from './db/client.js'
import { logger } from './lib/logger.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { messagesRouter } from './modules/messages/messages.routes.js'
import { notificationsRouter } from './modules/notifications/notifications.routes.js'
import { postsRouter } from './modules/posts/posts.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

const webDistDir = env.WEB_DIST_DIR ?? path.resolve(import.meta.dirname, '../../web/dist')

export function createApp() {
  const app = express()
  const isTest = env.NODE_ENV === 'test'

  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false)

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      // Compact access logs: no headers (cookies are sensitive anyway).
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  )
  app.use(helmet())
  if (env.CORS_ORIGIN.length > 0) {
    app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  }
  app.use(compression())
  app.use(express.json({ limit: '50kb' }))
  app.use(cookieParser())

  const api = Router()

  api.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`)
    res.json({ status: 'ok' })
  })

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: { message: 'Слишком много попыток, попробуй позже' } },
  })
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: { message: 'Слишком много запросов' } },
  })

  api.use(apiLimiter)
  api.use('/auth/login', authLimiter)
  api.use('/auth/register', authLimiter)
  api.use('/auth', authRouter)
  api.use('/users', usersRouter)
  api.use('/posts', postsRouter)
  api.use('/notifications', notificationsRouter)
  api.use('/messages', messagesRouter)
  api.use(notFoundHandler)

  app.use('/api', api)

  // Serve the built SPA (single-container deployment).
  if (existsSync(webDistDir)) {
    app.use(
      express.static(webDistDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          }
        },
      }),
    )
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDistDir, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
