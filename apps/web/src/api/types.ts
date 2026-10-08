export type Role = 'user' | 'admin'

export interface PublicUser {
  id: string
  name: string
  username: string
  bio: string
  role: Role
  createdAt: string
}

export interface Me extends PublicUser {
  email: string
}

export interface UserCard extends PublicUser {
  followersCount: number
  isFollowing: boolean
}

export interface Profile extends UserCard {
  followingCount: number
  postsCount: number
  followsYou: boolean
}

export interface Post {
  id: string
  text: string
  createdAt: string
  editedAt: string | null
  author: Pick<PublicUser, 'id' | 'name' | 'username' | 'role'>
  likesCount: number
  likedByMe: boolean
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface Notification {
  id: string
  type: 'like' | 'follow'
  createdAt: string
  readAt: string | null
  actor: Pick<PublicUser, 'id' | 'name' | 'username'>
  post: { id: string; text: string } | null
}

export interface Counters {
  notifications: number
  messages: number
}

export interface Conversation {
  partner: Pick<PublicUser, 'id' | 'name' | 'username'>
  lastMessage: { text: string; senderId: string; createdAt: string }
  unread: number
}

export interface Message {
  id: string
  senderId: string
  recipientId: string
  text: string
  readAt: string | null
  createdAt: string
}
