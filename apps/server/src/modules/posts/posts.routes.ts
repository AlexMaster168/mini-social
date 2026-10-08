import { and, desc, eq, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { follows, notifications, postLikes, posts, users } from '../../db/schema.js'
import { decodeCursor, encodeCursor } from '../../lib/cursor.js'
import { HttpError } from '../../lib/http-error.js'
import { paginationQuery, parse, uuidParam } from '../../lib/validate.js'
import { currentUserId, requireAuth } from '../../middleware/auth.js'

const FeedQuery = paginationQuery.extend({
  scope: z.enum(['all', 'following']).default('all'),
  author: z.uuid().optional(),
})

const PostBody = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Пост не может быть пустым')
    .max(500, 'Пост не длиннее 500 символов'),
})

function postColumns(viewerId: string) {
  return {
    id: posts.id,
    text: posts.text,
    createdAt: posts.createdAt,
    editedAt: posts.editedAt,
    author: {
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
    },
    // Explicitly qualified: see the note in users/user-queries.ts.
    likesCount: sql<number>`(select count(*)::int from post_likes pl where pl.post_id = "posts"."id")`,
    likedByMe: sql<boolean>`exists(select 1 from post_likes pl where pl.post_id = "posts"."id" and pl.user_id = ${viewerId})`,
  }
}

async function findPost(id: string, viewerId: string) {
  const [post] = await db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.id, id))
  if (!post) throw HttpError.notFound('Пост не найден')
  return post
}

async function findOwnPost(id: string, userId: string) {
  const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id))
  if (!post) throw HttpError.notFound('Пост не найден')
  if (post.authorId !== userId) throw HttpError.forbidden('Это не твой пост')
}

export const postsRouter = Router()
postsRouter.use(requireAuth)

postsRouter.get('/', async (req, res) => {
  const me = currentUserId(req)
  const { cursor: rawCursor, limit, scope, author } = parse(FeedQuery, req.query)
  const cursor = decodeCursor(rawCursor)

  const filters: (SQL | undefined)[] = []
  if (author) filters.push(eq(posts.authorId, author))
  if (scope === 'following') {
    filters.push(
      or(
        eq(posts.authorId, me),
        inArray(
          posts.authorId,
          db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, me)),
        ),
      ),
    )
  }
  if (cursor) {
    filters.push(
      or(
        lt(posts.createdAt, cursor.createdAt),
        and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)),
      ),
    )
  }

  const rows = await db
    .select(postColumns(me))
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit + 1)

  const items = rows.slice(0, limit)
  const last = items.at(-1)
  const nextCursor =
    rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null

  res.json({ items, nextCursor })
})

postsRouter.get('/:id', async (req, res) => {
  const { id } = parse(uuidParam, req.params)
  res.json({ post: await findPost(id, currentUserId(req)) })
})

postsRouter.post('/', async (req, res) => {
  const me = currentUserId(req)
  const { text } = parse(PostBody, req.body)

  const [created] = await db
    .insert(posts)
    .values({ authorId: me, text })
    .returning({ id: posts.id })
  res.status(201).json({ post: await findPost(created!.id, me) })
})

postsRouter.patch('/:id', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)
  const { text } = parse(PostBody, req.body)
  await findOwnPost(id, me)

  await db.update(posts).set({ text, editedAt: new Date() }).where(eq(posts.id, id))
  res.json({ post: await findPost(id, me) })
})

postsRouter.delete('/:id', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)
  await findOwnPost(id, me)

  await db.delete(posts).where(eq(posts.id, id))
  res.status(204).end()
})

postsRouter.post('/:id/like', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)

  const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id))
  if (!post) throw HttpError.notFound('Пост не найден')

  const inserted = await db
    .insert(postLikes)
    .values({ postId: id, userId: me })
    .onConflictDoNothing()
    .returning({ postId: postLikes.postId })

  if (inserted.length > 0 && post.authorId !== me) {
    await db
      .insert(notifications)
      .values({ userId: post.authorId, actorId: me, type: 'like', postId: id })
  }
  res.json({ post: await findPost(id, me) })
})

postsRouter.delete('/:id/like', async (req, res) => {
  const me = currentUserId(req)
  const { id } = parse(uuidParam, req.params)

  await db.transaction(async (tx) => {
    await tx.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, me)))
    await tx
      .delete(notifications)
      .where(
        and(
          eq(notifications.postId, id),
          eq(notifications.actorId, me),
          eq(notifications.type, 'like'),
        ),
      )
  })
  res.json({ post: await findPost(id, me) })
})
