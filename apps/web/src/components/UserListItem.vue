<script setup lang="ts">
import { BadgeCheck } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { UserCard } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { plural } from '@/utils/format'
import FollowButton from './FollowButton.vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{ user: UserCard; compact?: boolean }>()
const emit = defineEmits<{ change: [user: UserCard] }>()
const auth = useAuthStore()

function onFollowChange(following: boolean) {
  emit('change', {
    ...props.user,
    isFollowing: following,
    followersCount: props.user.followersCount + (following ? 1 : -1),
  })
}
</script>

<template>
  <RouterLink
    :to="{ name: 'profile', params: { username: user.username } }"
    class="user-item"
    :class="{ compact }"
  >
    <UserAvatar :name="user.name" :seed="user.username" :size="compact ? 40 : 48" />
    <div class="info">
      <div class="name">
        {{ user.name }}
        <BadgeCheck v-if="user.role === 'admin'" :size="16" class="verified" />
      </div>
      <div class="subtle">
        @{{ user.username }}
        <template v-if="!compact">
          · {{ user.followersCount }}
          {{ plural(user.followersCount, ['подписчик', 'подписчика', 'подписчиков']) }}
        </template>
      </div>
      <p v-if="!compact && user.bio" class="bio">{{ user.bio }}</p>
    </div>
    <FollowButton
      v-if="user.id !== auth.user?.id"
      :user-id="user.id"
      :following="user.isFollowing"
      size="sm"
      :icon-only="compact"
      @change="onFollowChange"
    />
  </RouterLink>
</template>

<style scoped>
.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  transition: background 0.15s;
}
.user-item.compact {
  padding: 10px 18px;
}
.user-item:hover {
  background: var(--surface-hover);
}
.info {
  flex: 1;
  min-width: 0;
  line-height: 1.35;
}
.name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.verified {
  color: var(--accent);
  flex-shrink: 0;
}
.bio {
  margin-top: 4px;
  font-size: 14px;
  color: var(--text-2);
}
</style>
