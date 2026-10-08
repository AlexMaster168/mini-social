import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from '../lib/http-error.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(HttpError.notFound('Маршрут не найден'))
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } })
    return
  }

  // Unique violation that slipped past the explicit checks (concurrent requests).
  // Drizzle wraps driver errors, so look at the cause as well.
  const pgCode =
    (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code
  if (pgCode === '23505') {
    res.status(409).json({ error: { message: 'Такая запись уже существует' } })
    return
  }

  // body-parser errors (malformed JSON, payload too large) carry a status.
  if (typeof err === 'object' && err !== null && 'status' in err && 'type' in err) {
    const status = Number(err.status)
    if (status >= 400 && status < 500) {
      res.status(status).json({ error: { message: 'Некорректное тело запроса' } })
      return
    }
  }

  req.log.error({ err }, 'Unhandled error')
  res.status(500).json({ error: { message: 'Внутренняя ошибка сервера' } })
}
