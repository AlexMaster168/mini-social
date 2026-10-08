import { sql } from 'drizzle-orm'
import { publicUserColumns } from './user-fields.js'

// Correlated subqueries are written with explicit aliases and a fully qualified "users"."id":
// Drizzle renders columns unqualified in single-table selects, so `${users.id}` would resolve
// to the subquery's own "id" column (e.g. posts.id) instead of the outer user.

export function followersCountSql() {
  return sql<number>`(select count(*)::int from follows f where f.following_id = "users"."id")`
}

export function isFollowingSql(viewerId: string) {
  return sql<boolean>`exists(select 1 from follows f where f.follower_id = ${viewerId} and f.following_id = "users"."id")`
}

/** Columns for user cards in lists: public fields + follow state relative to the viewer. */
export function userCardColumns(viewerId: string) {
  return {
    ...publicUserColumns,
    followersCount: followersCountSql(),
    isFollowing: isFollowingSql(viewerId),
  }
}

/** Columns for the full profile page. */
export function profileColumns(viewerId: string) {
  return {
    ...userCardColumns(viewerId),
    followingCount: sql<number>`(select count(*)::int from follows f where f.follower_id = "users"."id")`,
    postsCount: sql<number>`(select count(*)::int from posts p where p.author_id = "users"."id")`,
    followsYou: sql<boolean>`exists(select 1 from follows f where f.follower_id = "users"."id" and f.following_id = ${viewerId})`,
  }
}
