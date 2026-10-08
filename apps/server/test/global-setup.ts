import path from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

// Runs once in the main vitest process (test.env is not applied here).
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgres://postgres:alexalex@localhost:5432/mini_social_test'

  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade',
    )
    await client.query('create schema public')
    await migrate(drizzle({ client }), {
      migrationsFolder: path.resolve(import.meta.dirname, '../drizzle'),
    })
  } finally {
    await client.end()
  }
}
