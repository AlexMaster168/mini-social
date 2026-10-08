import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import type { Post } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import PostCard from './PostCard.vue'

const post: Post = {
  id: 'p1',
  text: 'Hello',
  createdAt: new Date().toISOString(),
  editedAt: null,
  author: { id: 'author', name: 'Vova Kotov', username: 'vova', role: 'user' },
  likesCount: 2,
  likedByMe: false,
}

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    id: 'me',
    name: 'Me',
    username: 'me',
    email: 'me@example.com',
    bio: '',
    role: 'user',
    createdAt: post.createdAt,
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/u/:username', name: 'profile', component: { template: '<div />' } },
      { path: '/messages/:userId?', name: 'messages', component: { template: '<div />' } },
    ],
  })
  return mount(PostCard, { props: { post }, global: { plugins: [pinia, router] } })
}

describe('PostCard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the author and text, without owner actions for foreign posts', () => {
    const wrapper = setup()
    expect(wrapper.text()).toContain('Vova Kotov')
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.find('[aria-label="Удалить"]').exists()).toBe(false)
  })

  it('likes optimistically and then applies the server state', async () => {
    const serverPost = { ...post, likesCount: 3, likedByMe: true }
    vi.spyOn(api.posts, 'like').mockResolvedValue({ post: serverPost })
    const wrapper = setup()

    await wrapper.get('[data-testid="like"]').trigger('click')
    const [optimistic] = wrapper.emitted('updated')![0] as [Post]
    expect(optimistic).toMatchObject({ likesCount: 3, likedByMe: true })

    await flushPromises()
    expect(wrapper.emitted('updated')!.at(-1)).toEqual([serverPost])
  })

  it('rolls back the optimistic like when the request fails', async () => {
    vi.spyOn(api.posts, 'like').mockRejectedValue(new ApiError(500, 'boom'))
    const wrapper = setup()

    await wrapper.get('[data-testid="like"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('updated')!.at(-1)).toEqual([post])
  })
})
