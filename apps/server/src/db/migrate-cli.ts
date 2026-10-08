import { logger } from '../lib/logger.js'
import { pool } from './client.js'
import { runMigrations } from './migrate.js'

try {
  await runMigrations()
  logger.info('Migrations applied')
} catch (error) {
  logger.error(error, 'Migration failed')
  process.exitCode = 1
} finally {
  await pool.end()
}
