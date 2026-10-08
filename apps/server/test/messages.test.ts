import { beforeEach, describe, expect, it } from 'vitest'
import { createUser, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('messages', () => {
  it('sends messages, lists conversations and tracks unread counters', async () => {
    const alice = await createUser()
    const bob = await createUser()

    await alice.agent.post(`/api/messages/${bob.user.id}`).send({ text: 'Привет!' }).expect(201)
    await alice.agent.post(`/api/messages/${bob.user.id}`).send({ text: 'Как дела?' }).expect(201)

    const counters = await bob.agent.get('/api/notifications/counters').expect(200)
    expect(counters.body).toEqual({ notifications: 0, messages: 2 })

    const conversations = await bob.agent.get('/api/messages/conversations').expect(200)
    expect(conversations.body.items).toHaveLength(1)
    expect(conversations.body.items[0]).toMatchObject({
      partner: { id: alice.user.id },
      lastMessage: { text: 'Как дела?', senderId: alice.user.id },
      unread: 2,
    })

    const history = await bob.agent.get(`/api/messages/${alice.user.id}`).expect(200)
    expect(history.body.items.map((m: { text: string }) => m.text)).toEqual([
      'Привет!',
      'Как дела?',
    ])

    // Opening the dialog marks messages as read.
    const after = await bob.agent.get('/api/notifications/counters')
    expect(after.body.messages).toBe(0)

    // The sender sees the conversation too, without unread messages.
    const aliceConversations = await alice.agent.get('/api/messages/conversations')
    expect(aliceConversations.body.items[0]).toMatchObject({
      partner: { id: bob.user.id },
      unread: 0,
    })
  })

  it('rejects messages to yourself, empty messages and unknown users', async () => {
    const alice = await createUser()
    await alice.agent.post(`/api/messages/${alice.user.id}`).send({ text: 'me' }).expect(400)
    await alice.agent
      .post('/api/messages/00000000-0000-4000-8000-000000000000')
      .send({ text: 'hi' })
      .expect(404)
    const bob = await createUser()
    await alice.agent.post(`/api/messages/${bob.user.id}`).send({ text: '  ' }).expect(400)
  })

  it('marks all notifications as read', async () => {
    const alice = await createUser()
    const bob = await createUser()
    await bob.agent.post(`/api/users/${alice.user.id}/follow`)

    const before = await alice.agent.get('/api/notifications/counters')
    expect(before.body.notifications).toBe(1)
    await alice.agent.post('/api/notifications/read-all').expect(204)
    const after = await alice.agent.get('/api/notifications/counters')
    expect(after.body.notifications).toBe(0)
  })
})
