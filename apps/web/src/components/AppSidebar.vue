<script setup lang="ts">
import { Bell, House, LogOut, MessageCircle, Moon, Settings, Sun, User, Users } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useCountersStore } from '@/stores/counters'
import UserAvatar from './UserAvatar.vue'

const auth = useAuthStore()
const counters = useCountersStore()
const router = useRouter()
const { theme, toggle } = useTheme()

const links = computed(() => [
  { to: { name: 'feed' }, label: 'Лента', icon: House, badge: 0 },
  {
    to: { name: 'profile', params: { username: auth.user?.username ?? '' } },
    label: 'Профиль',
    icon: User,
    badge: 0,
  },
  { to: { name: 'people' }, label: 'Люди', icon: Users, badge: 0 },
  {
    to: { name: 'notifications' },
    label: 'Уведомления',
    icon: Bell,
    badge: counters.notifications,
  },
  { to: { name: 'messages' }, label: 'Сообщения', icon: MessageCircle, badge: counters.messages },
  { to: { name: 'settings' }, label: 'Настройки', icon: Settings, badge: 0 },
])

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-inner">
      <RouterLink :to="{ name: 'feed' }" class="logo" aria-label="Mini Social — на главную">
        <span class="logo-mark">M</span>
        <span class="logo-text">Mini Social</span>
      </RouterLink>

      <nav class="nav" aria-label="Основная навигация">
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="nav-link"
          active-class="active"
          :data-testid="`nav-${link.label}`"
        >
          <span class="nav-icon">
            <component :is="link.icon" :size="22" :stroke-width="2" />
            <span v-if="link.badge > 0" class="nav-dot" aria-hidden="true" />
          </span>
          <span class="nav-label">{{ link.label }}</span>
          <span v-if="link.badge > 0" class="badge nav-badge">
            {{ link.badge > 99 ? '99+' : link.badge }}
            <span class="sr-only">непрочитанных</span>
          </span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <button
          type="button"
          class="nav-link theme-toggle"
          :aria-label="theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
          @click="toggle"
        >
          <span class="nav-icon">
            <Sun v-if="theme === 'dark'" :size="22" />
            <Moon v-else :size="22" />
          </span>
          <span class="nav-label">{{ theme === 'dark' ? 'Светлая тема' : 'Тёмная тема' }}</span>
        </button>

        <div v-if="auth.user" class="me">
          <UserAvatar :name="auth.user.name" :seed="auth.user.username" :size="40" />
          <div class="me-info">
            <span class="me-name">{{ auth.user.name }}</span>
            <span class="subtle">@{{ auth.user.username }}</span>
          </div>
          <button type="button" class="icon-btn" aria-label="Выйти" title="Выйти" @click="logout">
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
}
.sidebar-inner {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px 0;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 22px;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.02em;
}
.logo-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 20px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 11px 14px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-2);
  transition:
    background 0.15s,
    color 0.15s;
}
.nav-link:hover {
  background: var(--surface);
  color: var(--text);
}
.nav-link.active {
  background: var(--surface);
  color: var(--accent);
  font-weight: 700;
  box-shadow: var(--shadow);
}
.nav-icon {
  position: relative;
  display: inline-grid;
}
.nav-badge {
  margin-left: auto;
}
.nav-dot {
  display: none;
  position: absolute;
  top: -2px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg);
}
.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.me {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
}
.me-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}
.me-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .logo-text,
  .nav-label,
  .nav-badge,
  .me-info {
    display: none;
  }
  .nav-dot {
    display: block;
  }
  .logo,
  .nav-link {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }
  .me {
    flex-direction: column;
    padding: 8px 0;
    background: none;
    border: none;
  }
}

@media (max-width: 720px) {
  .sidebar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    background: var(--surface);
    border-top: 1px solid var(--border);
  }
  .sidebar-inner {
    position: static;
    height: auto;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  }
  .logo,
  .sidebar-footer {
    display: none;
  }
  .nav {
    flex-direction: row;
    justify-content: space-around;
  }
  .nav-link {
    width: auto;
    padding: 10px;
  }
  .nav-link.active {
    box-shadow: none;
    background: var(--accent-soft);
  }
}
</style>
