<script setup lang="ts">
import { BadgeCheck } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Profile, UserCard } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { joinedAt } from '@/utils/format'
import UserAvatar from './UserAvatar.vue'
import UserListItem from './UserListItem.vue'

const auth = useAuthStore()
const profile = ref<Profile | null>(null)
const suggestions = ref<UserCard[]>([])

onMounted(async () => {
  if (!auth.user) return
  const [me, suggested] = await Promise.allSettled([
    api.users.profile(auth.user.username),
    api.users.suggestions(),
  ])
  if (me.status === 'fulfilled') profile.value = me.value.user
  if (suggested.status === 'fulfilled') suggestions.value = suggested.value.items
})

function onSuggestionChange(user: UserCard) {
  suggestions.value = suggestions.value.map((u) => (u.id === user.id ? user : u))
  if (profile.value) profile.value.followingCount += user.isFollowing ? 1 : -1
}
</script>

<template>
  <aside class="rail">
    <div class="rail-inner stack">
      <section v-if="auth.user" class="card me-card">
        <div class="cover" />
        <RouterLink
          :to="{ name: 'profile', params: { username: auth.user.username } }"
          class="me-head"
        >
          <UserAvatar
            :name="auth.user.name"
            :seed="auth.user.username"
            :size="64"
            class="me-avatar"
          />
          <div class="me-name">
            {{ auth.user.name }}
            <BadgeCheck v-if="auth.user.role === 'admin'" :size="18" class="verified" />
          </div>
          <div class="subtle">@{{ auth.user.username }}</div>
        </RouterLink>
        <p v-if="auth.user.bio" class="me-bio">{{ auth.user.bio }}</p>
        <div class="stats">
          <div>
            <strong>{{ profile?.postsCount ?? '–' }}</strong>
            <span class="subtle">постов</span>
          </div>
          <RouterLink :to="{ name: 'people', query: { tab: 'followers' } }">
            <strong>{{ profile?.followersCount ?? '–' }}</strong>
            <span class="subtle">подписчиков</span>
          </RouterLink>
          <RouterLink :to="{ name: 'people', query: { tab: 'following' } }">
            <strong>{{ profile?.followingCount ?? '–' }}</strong>
            <span class="subtle">подписок</span>
          </RouterLink>
        </div>
        <p class="subtle joined">{{ joinedAt(auth.user.createdAt) }}</p>
      </section>

      <section v-if="suggestions.length" class="card">
        <h2 class="card-title">Кого почитать</h2>
        <ul class="suggestions">
          <li v-for="user in suggestions" :key="user.id">
            <UserListItem :user="user" compact @change="onSuggestionChange" />
          </li>
        </ul>
      </section>

      <footer class="subtle footer">
        © {{ new Date().getFullYear() }} Mini Social ·
        <a href="https://github.com/AlexMaster168/mini-social" target="_blank" rel="noopener"
          >GitHub</a
        >
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.rail-inner {
  position: sticky;
  top: 20px;
}
.me-card {
  overflow: hidden;
  text-align: center;
}
.cover {
  height: 72px;
  background: linear-gradient(120deg, var(--accent), #a855f7 60%, #ec4899);
}
.me-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -34px;
  padding: 0 16px;
}
.me-avatar {
  border: 4px solid var(--surface);
  box-sizing: content-box;
}
.me-name {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-weight: 700;
  font-size: 17px;
}
.verified {
  color: var(--accent);
}
.me-bio {
  padding: 8px 20px 0;
  font-size: 14px;
  color: var(--text-2);
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 16px 16px 0;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.stats > * {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  border-radius: 8px;
}
.stats a:hover strong {
  color: var(--accent);
}
.stats strong {
  font-size: 18px;
}
.joined {
  padding: 10px 0 14px;
}
.suggestions {
  padding-bottom: 8px;
}
.footer {
  padding: 0 8px;
}
.footer a:hover {
  color: var(--accent);
}
</style>
