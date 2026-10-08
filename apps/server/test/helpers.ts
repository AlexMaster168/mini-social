import { sql } from 'drizzle-orm'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { db } from '../src/db/client.js'

export const app = createApp()

export async function resetDb() {
  await db.execute(
    sql`truncate table notifications, messages, post_likes, follows, posts, users restart identity cascade`,
  )
}

let counter = 0

export interface TestUser {
  agent: ReturnType<typeof request.agent>
  user: { id: string; name: string; username: string; email: string }
  password: string
}

/** Registers a fresh user and returns a cookie-carrying agent logged in as them. */
export async function createUser(overrides: Partial<{ name: string; username: string }> = {}) {
  counter += 1
  const username = overrides.username ?? `user_${counter}_${Date.now() % 100000}`
  const password = 'super-secret-1'
  const agent = request.agent(app)
  const res = await agent
    .post('/api/auth/register')
    .send({
      name: overrides.name ?? `User ${counter}`,
      username,
      email: `${username}@example.com`,
      password,
    })
    .expect(201)
  return { agent, user: res.body.user, password } as TestUser
}
