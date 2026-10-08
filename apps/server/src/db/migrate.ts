import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client.js'

// src/db (tsx) and dist/db (compiled) are both two levels below apps/server.
export const migrationsFolder = path.resolve(import.meta.dirname, '../../drizzle')

export async function runMigrations() {
  await migrate(db, { migrationsFolder })
}
