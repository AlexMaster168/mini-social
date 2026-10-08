import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import { logger } from './lib/logger.js'

await runMigrations()
logger.info('Database migrations are up to date')

const server = createApp().listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`)
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`${signal} received, shutting down`)

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async () => {
    await pool.end()
    logger.info('Shutdown complete')
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection')
})
