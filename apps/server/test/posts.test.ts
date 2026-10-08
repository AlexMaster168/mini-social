import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app, createUser, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('posts', () => {
  it('creates a post with author info', async () => {
    const { agent, user } = await createUser()
    const res = await agent.post('/api/posts').send({ text: '  Привет, мир!  ' }).expect(201)
    expect(res.body.post).toMatchObject({
      text: 'Привет, мир!',
      likesCount: 0,
      likedByMe: false,
      author: { id: user.id, username: user.username },
    })
  })

  it('rejects empty and too long posts', async () => {
    const { agent } = await createUser()
    await agent.post('/api/posts').send({ text: '   ' }).expect(400)
    await agent
      .post('/api/posts')
      .send({ text: 'x'.repeat(501) })
      .expect(400)
  })

  it('only lets the author edit or delete a post', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const { body } = await alice.agent.post('/api/posts').send({ text: 'mine' }).expect(201)
    const id = body.post.id

    await bob.agent.patch(`/api/posts/${id}`).send({ text: 'hacked' }).expect(403)
    await bob.agent.delete(`/api/posts/${id}`).expect(403)

    const edited = await alice.agent.patch(`/api/posts/${id}`).send({ text: 'edited' }).expect(200)
    expect(edited.body.post.text).toBe('edited')
    expect(edited.body.post.editedAt).not.toBeNull()

    await alice.agent.delete(`/api/posts/${id}`).expect(204)
    await alice.agent.get(`/api/posts/${id}`).expect(404)
  })

  it('likes are idempotent and notify the author once', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const { body } = await alice.agent.post('/api/posts').send({ text: 'like me' })
    const id = body.post.id

    await bob.agent.post(`/api/posts/${id}/like`).expect(200)
    const liked = await bob.agent.post(`/api/posts/${id}/like`).expect(200)
    expect(liked.body.post).toMatchObject({ likesCount: 1, likedByMe: true })

    const notifications = await alice.agent.get('/api/notifications').expect(200)
    expect(notifications.body.items).toHaveLength(1)
    expect(notifications.body.items[0]).toMatchObject({
      type: 'like',
      actor: { id: bob.user.id },
      post: { id },
    })

    const unliked = await bob.agent.delete(`/api/posts/${id}/like`).expect(200)
    expect(unliked.body.post).toMatchObject({ likesCount: 0, likedByMe: false })
    const after = await alice.agent.get('/api/notifications')
    expect(after.body.items).toHaveLength(0)
  })

  it('does not notify when liking your own post', async () => {
    const alice = await createUser()
    const { body } = await alice.agent.post('/api/posts').send({ text: 'self' })
    await alice.agent.post(`/api/posts/${body.post.id}/like`).expect(200)
    const notifications = await alice.agent.get('/api/notifications')
    expect(notifications.body.items).toHaveLength(0)
  })

  it('paginates the feed with a stable cursor', async () => {
    const { agent } = await createUser()
    for (let i = 1; i <= 5; i++) {
      await agent
        .post('/api/posts')
        .send({ text: `post ${i}` })
        .expect(201)
    }

    const page1 = await agent.get('/api/posts?limit=2').expect(200)
    expect(page1.body.items.map((p: { text: string }) => p.text)).toEqual(['post 5', 'post 4'])
    expect(page1.body.nextCursor).toBeTruthy()

    const page2 = await agent.get(`/api/posts?limit=2&cursor=${page1.body.nextCursor}`)
    expect(page2.body.items.map((p: { text: string }) => p.text)).toEqual(['post 3', 'post 2'])

    const page3 = await agent.get(`/api/posts?limit=2&cursor=${page2.body.nextCursor}`)
    expect(page3.body.items.map((p: { text: string }) => p.text)).toEqual(['post 1'])
    expect(page3.body.nextCursor).toBeNull()
  })

  it('following feed shows only my posts and posts of people I follow', async () => {
    const alice = await createUser()
    const bob = await createUser()
    const carol = await createUser()
    await alice.agent.post('/api/posts').send({ text: 'from alice' })
    await bob.agent.post('/api/posts').send({ text: 'from bob' })
    await carol.agent.post('/api/posts').send({ text: 'from carol' })

    await alice.agent.post(`/api/users/${bob.user.id}/follow`).expect(204)

    const feed = await alice.agent.get('/api/posts?scope=following').expect(200)
    const texts = feed.body.items.map((p: { text: string }) => p.text).sort()
    expect(texts).toEqual(['from alice', 'from bob'])

    const byAuthor = await alice.agent.get(`/api/posts?author=${carol.user.id}`).expect(200)
    expect(byAuthor.body.items).toHaveLength(1)
  })

  it('returns 400 for malformed ids and 401 without a session', async () => {
    const { agent } = await createUser()
    await agent.get('/api/posts/not-a-uuid').expect(400)
    await request(app).get('/api/posts').expect(401)
  })
})
