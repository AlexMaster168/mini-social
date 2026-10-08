import { aliasedTable, and, count, desc, eq, isNull } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../../db/client.js'
import { messages, notifications, posts, users } from '../../db/schema.js'
import { currentUserId, requireAuth } from '../../middleware/auth.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

const actor = aliasedTable(users, 'actor')

notificationsRouter.get('/', async (req, res) => {
  const me = currentUserId(req)

  const items = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      actor: { id: actor.id, name: actor.name, username: actor.username },
      post: { id: posts.id, text: posts.text },
    })
    .from(notifications)
    .innerJoin(actor, eq(actor.id, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .where(eq(notifications.userId, me))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  res.json({ items })
})

notificationsRouter.post('/read-all', async (req, res) => {
  const me = currentUserId(req)
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, me), isNull(notifications.readAt)))
  res.status(204).end()
})

/** Badge counters for the sidebar. */
notificationsRouter.get('/counters', async (req, res) => {
  const me = currentUserId(req)

  const [[unreadNotifications], [unreadMessages]] = await Promise.all([
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, me), isNull(notifications.readAt))),
    db
      .select({ value: count() })
      .from(messages)
      .where(and(eq(messages.recipientId, me), isNull(messages.readAt))),
  ])

  res.json({
    notifications: unreadNotifications?.value ?? 0,
    messages: unreadMessages?.value ?? 0,
  })
})
