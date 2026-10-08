import type {
  Conversation,
  Counters,
  Me,
  Message,
  Notification,
  Page,
  Post,
  Profile,
  PublicUser,
  UserCard,
} from './types'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Query = Record<string, string | number | undefined | null>

/** Called on any 401 so the app can drop the session (set by the auth store). */
let onUnauthorized: (() => void) | undefined
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Query } = {},
): Promise<T> {
  let url = `/api${path}`
  if (options.query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Нет соединения с сервером')
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.()
    throw new ApiError(
      response.status,
      data?.error?.message ?? 'Что-то пошло не так',
      data?.error?.details,
    )
  }
  return data as T
}

export const api = {
  auth: {
    me: () => request<{ user: Me }>('GET', '/auth/me'),
    login: (body: { login: string; password: string }) =>
      request<{ user: Me }>('POST', '/auth/login', { body }),
    register: (body: { name: string; username: string; email: string; password: string }) =>
      request<{ user: Me }>('POST', '/auth/register', { body }),
    logout: () => request<void>('POST', '/auth/logout'),
  },
  users: {
    search: (q: string) => request<{ items: UserCard[] }>('GET', '/users', { query: { q } }),
    suggestions: () => request<{ items: UserCard[] }>('GET', '/users/suggestions'),
    profile: (username: string) =>
      request<{ user: Profile }>('GET', `/users/by-username/${encodeURIComponent(username)}`),
    followers: (id: string) => request<{ items: UserCard[] }>('GET', `/users/${id}/followers`),
    following: (id: string) => request<{ items: UserCard[] }>('GET', `/users/${id}/following`),
    follow: (id: string) => request<void>('POST', `/users/${id}/follow`),
    unfollow: (id: string) => request<void>('DELETE', `/users/${id}/follow`),
    updateMe: (body: Partial<Pick<Me, 'name' | 'username' | 'email' | 'bio'>>) =>
      request<{ user: Me }>('PATCH', '/users/me', { body }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      request<void>('PUT', '/users/me/password', { body }),
    deleteMe: (password: string) => request<void>('DELETE', '/users/me', { body: { password } }),
  },
  posts: {
    list: (query: { scope?: 'all' | 'following'; author?: string; cursor?: string | null }) =>
      request<Page<Post>>('GET', '/posts', { query }),
    create: (text: string) => request<{ post: Post }>('POST', '/posts', { body: { text } }),
    update: (id: string, text: string) =>
      request<{ post: Post }>('PATCH', `/posts/${id}`, { body: { text } }),
    remove: (id: string) => request<void>('DELETE', `/posts/${id}`),
    like: (id: string) => request<{ post: Post }>('POST', `/posts/${id}/like`),
    unlike: (id: string) => request<{ post: Post }>('DELETE', `/posts/${id}/like`),
  },
  notifications: {
    list: () => request<{ items: Notification[] }>('GET', '/notifications'),
    readAll: () => request<void>('POST', '/notifications/read-all'),
    counters: () => request<Counters>('GET', '/notifications/counters'),
  },
  messages: {
    conversations: () => request<{ items: Conversation[] }>('GET', '/messages/conversations'),
    history: (userId: string) =>
      request<{ partner: Pick<PublicUser, 'id' | 'name' | 'username'>; items: Message[] }>(
        'GET',
        `/messages/${userId}`,
      ),
    send: (userId: string, text: string) =>
      request<{ message: Message }>('POST', `/messages/${userId}`, { body: { text } }),
  },
}
