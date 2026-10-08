import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FeedView from '@/views/FeedView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Accessible without a session. */
    public?: boolean
    /** Only for guests (login/register); signed-in users are sent to the feed. */
    guestOnly?: boolean
    /** Hide the right column to give the page full width. */
    wide?: boolean
    title?: string
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', name: 'feed', component: FeedView, meta: { title: 'Лента' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, guestOnly: true, title: 'Вход' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true, guestOnly: true, title: 'Регистрация' },
    },
    {
      path: '/u/:username',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: 'Профиль' },
    },
    {
      path: '/people',
      name: 'people',
      component: () => import('@/views/PeopleView.vue'),
      meta: { title: 'Люди' },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { title: 'Уведомления' },
    },
    {
      path: '/messages/:userId?',
      name: 'messages',
      component: () => import('@/views/MessagesView.vue'),
      meta: { wide: true, title: 'Сообщения' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: 'Настройки' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true, title: 'Страница не найдена' },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) return { name: 'feed' }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Mini Social` : 'Mini Social'
})
