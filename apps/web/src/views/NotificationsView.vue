<script setup lang="ts">
import { BellOff, Heart, UserPlus } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Notification } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useCountersStore } from '@/stores/counters'
import { useToastStore } from '@/stores/toast'
import { relativeTime } from '@/utils/format'

const counters = useCountersStore()
const toast = useToastStore()
const items = ref<Notification[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    items.value = (await api.notifications.list()).items
    // Highlight unread items on this visit, but clear the badge right away.
    if (items.value.some((n) => !n.readAt)) {
      await api.notifications.readAll()
      counters.notifications = 0
    }
  } catch (error) {
    toast.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageHeader title="Уведомления" />

  <div v-if="loading" class="card skeleton" style="height: 240px" />

  <EmptyState
    v-else-if="items.length === 0"
    :icon="BellOff"
    title="Уведомлений нет"
    text="Здесь появятся лайки и новые подписчики."
  />

  <section v-else class="card list">
    <ul>
      <li v-for="item in items" :key="item.id" class="item" :class="{ unread: !item.readAt }">
        <span class="kind" :class="item.type">
          <Heart v-if="item.type === 'like'" :size="16" fill="currentColor" />
          <UserPlus v-else :size="16" />
        </span>
        <RouterLink :to="{ name: 'profile', params: { username: item.actor.username } }">
          <UserAvatar :name="item.actor.name" :seed="item.actor.username" :size="40" />
        </RouterLink>
        <div class="content">
          <p>
            <RouterLink
              :to="{ name: 'profile', params: { username: item.actor.username } }"
              class="actor"
              >{{ item.actor.name }}</RouterLink
            >
            {{ item.type === 'like' ? 'оценил(а) твой пост' : 'подписался(-ась) на тебя' }}
            <span class="subtle">· {{ relativeTime(item.createdAt) }}</span>
          </p>
          <p v-if="item.post" class="quote">«{{ item.post.text }}»</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.list {
  overflow: hidden;
}
.item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 16px 52px;
}
.item + .item {
  border-top: 1px solid var(--border);
}
.item.unread {
  background: var(--accent-soft);
}
.kind {
  position: absolute;
  left: 16px;
  top: 26px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.kind.like {
  color: var(--like);
  background: var(--like-soft);
}
.kind.follow {
  color: var(--accent);
  background: var(--accent-soft);
}
.content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}
.actor {
  font-weight: 700;
}
.actor:hover {
  text-decoration: underline;
}
.quote {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
