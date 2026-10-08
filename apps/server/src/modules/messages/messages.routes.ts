import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { messages, users } from '../../db/schema.js'
import { HttpError } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import { currentUserId, requireAuth } from '../../middleware/auth.js'

const PartnerParams = z.object({ userId: z.uuid('Некорректный идентификатор') })

const HistoryQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const MessageBody = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Сообщение не может быть пустым')
    .max(1000, 'Сообщение не длиннее 1000 символов'),
})

interface ConversationRow extends Record<string, unknown> {
  partner_id: string
  name: string
  username: string
  last_text: string
  last_sender_id: string
  last_at: Date
  unread: number
}

const messageColumns = {
  id: messages.id,
  senderId: messages.senderId,
  recipientId: messages.recipientId,
  text: messages.text,
  readAt: messages.readAt,
  createdAt: messages.createdAt,
}

function between(a: string, b: string) {
  return or(
    and(eq(messages.senderId, a), eq(messages.recipientId, b)),
    and(eq(messages.senderId, b), eq(messages.recipientId, a)),
  )
}

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

messagesRouter.get('/conversations', async (req, res) => {
  const me = currentUserId(req)

  const { rows } = await db.execute<ConversationRow>(sql`
    with mine as (
      select
        case when m.sender_id = ${me} then m.recipient_id else m.sender_id end as partner_id,
        m.text, m.sender_id, m.created_at
      from ${messages} m
      where m.sender_id = ${me} or m.recipient_id = ${me}
    ),
    latest as (
      select distinct on (partner_id) partner_id, text, sender_id, created_at
      from mine
      order by partner_id, created_at desc
    )
    select
      l.partner_id, u.name, u.username,
      l.text as last_text, l.sender_id as last_sender_id, l.created_at as last_at,
      (
        select count(*)::int from ${messages} m
        where m.sender_id = l.partner_id and m.recipient_id = ${me} and m.read_at is null
      ) as unread
    from latest l
    join ${users} u on u.id = l.partner_id
    order by l.created_at desc
  `)

  res.json({
    items: rows.map((row) => ({
      partner: { id: row.partner_id, name: row.name, username: row.username },
      lastMessage: {
        text: row.last_text,
        senderId: row.last_sender_id,
        createdAt: new Date(row.last_at).toISOString(),
      },
      unread: Number(row.unread),
    })),
  })
})

messagesRouter.get('/:userId', async (req, res) => {
  const me = currentUserId(req)
  const { userId } = parse(PartnerParams, req.params)
  const { before, limit } = parse(HistoryQuery, req.query)

  const [partner] = await db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
  if (!partner) throw HttpError.notFound('Пользователь не найден')

  const rows = await db
    .select(messageColumns)
    .from(messages)
    .where(and(between(me, userId), before ? lt(messages.createdAt, new Date(before)) : undefined))
    .orderBy(desc(messages.createdAt))
    .limit(limit)

  // Opening a dialog marks incoming messages as read.
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(eq(messages.senderId, userId), eq(messages.recipientId, me), isNull(messages.readAt)),
    )

  res.json({ partner, items: rows.reverse(), hasMore: rows.length === limit })
})

messagesRouter.post('/:userId', async (req, res) => {
  const me = currentUserId(req)
  const { userId } = parse(PartnerParams, req.params)
  const { text } = parse(MessageBody, req.body)
  if (userId === me) throw HttpError.badRequest('Нельзя написать самому себе')

  const [partner] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
  if (!partner) throw HttpError.notFound('Пользователь не найден')

  const [message] = await db
    .insert(messages)
    .values({ senderId: me, recipientId: userId, text })
    .returning(messageColumns)
  res.status(201).json({ message })
})
