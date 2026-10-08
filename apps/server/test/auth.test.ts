import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app, createUser, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('auth', () => {
  it('registers a user, sets an httpOnly cookie and never leaks the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Лёха', username: 'alex', email: 'Alex@Example.com', password: 'password123' })
      .expect(201)

    expect(res.body.user).toMatchObject({
      name: 'Лёха',
      username: 'alex',
      email: 'alex@example.com',
    })
    expect(res.body.user).not.toHaveProperty('passwordHash')
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/ms_token=/)
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it('validates input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', username: 'a b', email: 'nope', password: '123' })
      .expect(400)
    expect(res.body.error.details).toHaveProperty('username')
    expect(res.body.error.details).toHaveProperty('email')
    expect(res.body.error.details).toHaveProperty('password')
  })

  it('rejects duplicate username and e-mail case-insensitively', async () => {
    const { user } = await createUser({ username: 'Taken' })
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', username: 'taken', email: 'other@example.com', password: 'password123' })
      .expect(409)
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'X',
        username: 'free',
        email: user.email.toUpperCase(),
        password: 'password123',
      })
      .expect(409)
  })

  it('logs in by e-mail or username and rejects a wrong password', async () => {
    const { user, password } = await createUser()
    await request(app).post('/api/auth/login').send({ login: user.email, password }).expect(200)
    await request(app).post('/api/auth/login').send({ login: user.username, password }).expect(200)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: user.username, password: 'wrong-password' })
      .expect(401)
    expect(res.body.error.message).toBe('Неверный логин или пароль')
  })

  it('protects /me and clears the session on logout', async () => {
    await request(app).get('/api/auth/me').expect(401)

    const { agent, user } = await createUser()
    const me = await agent.get('/api/auth/me').expect(200)
    expect(me.body.user.id).toBe(user.id)

    await agent.post('/api/auth/logout').expect(204)
    await agent.get('/api/auth/me').expect(401)
  })

  it('rejects a forged token', async () => {
    await request(app).get('/api/auth/me').set('Cookie', 'ms_token=not-a-jwt').expect(401)
  })
})

describe('health', () => {
  it('reports ok when the database is reachable', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' })
  })
})
