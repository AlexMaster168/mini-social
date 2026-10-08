<script setup lang="ts">
import { Search, Users } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { UserCard } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import UserListItem from '@/components/UserListItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

type Tab = 'search' | 'followers' | 'following'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const tab = computed<Tab>(() => {
  const value = route.query.tab
  return value === 'followers' || value === 'following' ? value : 'search'
})
/** Whose followers/following to show; defaults to the current user. */
const username = computed(() =>
  typeof route.query.user === 'string' ? route.query.user : auth.user?.username,
)
const isMine = computed(() => username.value === auth.user?.username)

const query = ref('')
const users = ref<UserCard[]>([])
const loading = ref(false)
let debounce: ReturnType<typeof setTimeout> | undefined
let requestId = 0

async function load() {
  const id = ++requestId
  loading.value = true
  try {
    let items: UserCard[]
    if (tab.value === 'search') {
      items = (await api.users.search(query.value)).items
    } else {
      const owner = isMine.value
        ? auth.user!.id
        : (await api.users.profile(username.value!)).user.id
      items = (
        tab.value === 'followers'
          ? await api.users.followers(owner)
          : await api.users.following(owner)
      ).items
    }
    // Ignore responses that arrive after a newer request was made.
    if (id === requestId) users.value = items
  } catch (error) {
    toast.error(error)
  } finally {
    if (id === requestId) loading.value = false
  }
}

function setTab(next: Tab) {
  void router.replace({ query: { ...route.query, tab: next === 'search' ? undefined : next } })
}

function onChange(user: UserCard) {
  users.value = users.value.map((u) => (u.id === user.id ? user : u))
}

watch([tab, username], load, { immediate: true })
watch(query, () => {
  clearTimeout(debounce)
  debounce = setTimeout(load, 250)
})

const title = computed(() =>
  isMine.value || tab.value === 'search' ? 'Люди' : `Люди · @${username.value}`,
)
const emptyText = computed(() => {
  if (tab.value === 'search')
    return query.value ? 'По запросу никого не нашлось.' : 'Пока никого нет.'
  if (tab.value === 'followers')
    return isMine.value ? 'На тебя пока никто не подписан.' : 'Подписчиков нет.'
  return isMine.value ? 'Ты пока ни на кого не подписан.' : 'Подписок нет.'
})
</script>

<template>
  <PageHeader :title="title" :back="!isMine" />

  <div class="stack">
    <div class="tabs" role="tablist">
      <button
        v-for="item in [
          { key: 'search', label: 'Поиск' },
          { key: 'followers', label: 'Подписчики' },
          { key: 'following', label: 'Подписки' },
        ] as const"
        :key="item.key"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: tab === item.key }"
        :aria-selected="tab === item.key"
        @click="setTab(item.key)"
      >
        {{ item.label }}
      </button>
    </div>

    <label v-if="tab === 'search'" class="search card">
      <Search :size="18" class="search-icon" />
      <span class="sr-only">Поиск людей</span>
      <input
        v-model="query"
        type="search"
        placeholder="Имя или логин"
        autocomplete="off"
        data-testid="people-search"
      />
    </label>

    <section v-if="users.length" class="card list" :class="{ dim: loading }">
      <ul>
        <li v-for="user in users" :key="user.id">
          <UserListItem :user="user" @change="onChange" />
        </li>
      </ul>
    </section>
    <EmptyState v-else-if="!loading" :icon="Users" title="Никого" :text="emptyText" />
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}
.search-icon {
  color: var(--text-3);
}
.search input {
  flex: 1;
  height: 48px;
  border: none;
  background: none;
  font-size: 15px;
}
.search input:focus {
  outline: none;
}
.search:focus-within {
  border-color: var(--accent);
}
.list {
  overflow: hidden;
  transition: opacity 0.15s;
}
.list li + li {
  border-top: 1px solid var(--border);
}
.dim {
  opacity: 0.6;
}
</style>
