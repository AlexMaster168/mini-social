import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app, createUser, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('profile', () => {
  it('counts posts, followers and following of the right user', async () => {
    const alice = await createUser()
    const bob = await createUser()
    await alice.agent.post('/api/posts').send({ text: 'one' })
    await alice.agent.post('/api/posts').send({ text: 'two' })
    await bob.agent.post('/api/posts').send({ text: 'bob' })
    await bob.agent.post(`/api/users/${alice.user.id}/follow`)

    const res = await bob.agent.get(`/api/users/by-username/${alice.user.username.toUpperCase()}`)
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      id: alice.user.id,
      postsCount: 2,
      followersCount: 1,
      followingCount: 0,
      isFollowing: true,
      followsYou: false,
    })
    expect(res.body.user).not.toHaveProperty('email')
  })

  it('returns 404 for an unknown username', async () => {
    const alice = await createUser()
    await alice.agent.get('/api/users/by-username/nobody_here').expect(404)
  })
})

describe('follows', () => {
  it('follows and unfollows, updating counters on both profiles', async () => {
    const alice = await createUser()
    const bob = await createUser()

    await alice.agent.post(`/api/users/${bob.user.id}/follow`).expect(204)
    await alice.agent.post(`/api/users/${bob.user.id}/follow`).expect(204) // idempotent

    const bobProfile = await alice.agent.get(`/api/users/by-username/${bob.user.username}`)
    expect(bobProfile.body.user).toMatchObject({
      followersCount: 1,
      followingCount: 0,
      isFollowing: true,
      followsYou: false,
    })

    const aliceSeenByBob = await bob.agent.get(`/api/users/by-username/${alice.user.username}`)
    expect(aliceSeenByBob.body.user).toMatchObject({ followingCount: 1, followsYou: true })

    const followers = await bob.agent.get(`/api/users/${bob.user.id}/followers`)
    expect(followers.body.items.map((u: { id: string }) => u.id)).toEqual([alice.user.id])

    const notifications = await bob.agent.get('/api/notifications')
    expect(notifications.body.items[0]).toMatchObject({ type: 'follow' })

    await alice.agent.delete(`/api/users/${bob.user.id}/follow`).expect(204)
    const after = await alice.agent.get(`/api/users/by-username/${bob.user.username}`)
    expect(after.body.user).toMatchObject({ followersCount: 0, isFollowing: false })
  })

  it('does not allow following yourself or a missing user', async () => {
    const alice = await createUser()
    await alice.agent.post(`/api/users/${alice.user.id}/follow`).expect(400)
    await alice.agent.post('/api/users/00000000-0000-4000-8000-000000000000/follow').expect(404)
  })

  it('suggests people I do not follow yet', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const carol = await createUser()
    await alice.agent.post(`/api/users/${bob.user.id}/follow`)

    const res = await alice.agent.get('/api/users/suggestions').expect(200)
    expect(res.body.items.map((u: { id: string }) => u.id)).toEqual([carol.user.id])
  })
})

describe('search', () => {
  it('finds users by name or username and treats % literally', async () => {
    const alice = await createUser({ name: 'Алексей Сильвейструк', username: 'alexmaster' })
    await createUser({ name: 'Vova Kotov', username: 'vova' })

    const byName = await alice.agent.get('/api/users?q=алекс').expect(200)
    expect(byName.body.items.map((u: { username: string }) => u.username)).toEqual(['alexmaster'])

    const byUsername = await alice.agent.get('/api/users?q=VOV').expect(200)
    expect(byUsername.body.items).toHaveLength(1)

    const wildcard = await alice.agent.get('/api/users?q=%25').expect(200)
    expect(wildcard.body.items).toHaveLength(0)
  })
})

describe('settings', () => {
  it('updates profile fields and rejects a taken username', async () => {
    const alice = await createUser()
    const bob = await createUser()

    const res = await alice.agent
      .patch('/api/users/me')
      .send({ name: 'Alice Cooper', bio: 'Rock' })
      .expect(200)
    expect(res.body.user).toMatchObject({ name: 'Alice Cooper', bio: 'Rock' })

    await alice.agent.patch('/api/users/me').send({ username: bob.user.username }).expect(409)
  })

  it('changes the password only with the current one', async () => {
    const alice = await createUser()
    await alice.agent
      .put('/api/users/me/password')
      .send({ currentPassword: 'wrong', newPassword: 'brand-new-pass' })
      .expect(400)
    await alice.agent
      .put('/api/users/me/password')
      .send({ currentPassword: alice.password, newPassword: 'brand-new-pass' })
      .expect(204)

    await request(app)
      .post('/api/auth/login')
      .send({ login: alice.user.username, password: 'brand-new-pass' })
      .expect(200)
  })

  it('deletes the account with all its data', async () => {
    const alice = await createUser()
    const bob = await createUser()
    await alice.agent.post('/api/posts').send({ text: 'bye' })
    await alice.agent.post(`/api/users/${bob.user.id}/follow`)

    await alice.agent.delete('/api/users/me').send({ password: alice.password }).expect(204)
    await alice.agent.get('/api/auth/me').expect(401)

    const feed = await bob.agent.get('/api/posts')
    expect(feed.body.items).toHaveLength(0)
    const profile = await bob.agent.get(`/api/users/by-username/${bob.user.username}`)
    expect(profile.body.user.followersCount).toBe(0)
  })
})
