<script setup lang="ts">
import { BadgeCheck, CalendarDays, MessageCircle, Settings, UserX } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api, ApiError } from '@/api/client'
import type { Post, Profile } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import FollowButton from '@/components/FollowButton.vue'
import PageHeader from '@/components/PageHeader.vue'
import PostComposer from '@/components/PostComposer.vue'
import PostList from '@/components/PostList.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { joinedAt, plural } from '@/utils/format'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const profile = ref<Profile | null>(null)
const notFound = ref(false)
const list = ref<InstanceType<typeof PostList>>()
const isMe = computed(() => profile.value?.id === auth.user?.id)

onMounted(async () => {
  try {
    profile.value = (await api.users.profile(String(route.params.username))).user
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound.value = true
    else toast.error(error)
  }
})

function onFollowChange(following: boolean) {
  if (!profile.value) return
  profile.value.isFollowing = following
  profile.value.followersCount += following ? 1 : -1
}

function onCreated(post: Post) {
  list.value?.prepend(post)
  if (profile.value) profile.value.postsCount += 1
}
</script>

<template>
  <PageHeader
    back
    :title="profile?.name ?? 'Профиль'"
    :subtitle="
      profile
        ? `${profile.postsCount} ${plural(profile.postsCount, ['пост', 'поста', 'постов'])}`
        : undefined
    "
  />

  <EmptyState
    v-if="notFound"
    :icon="UserX"
    title="Пользователь не найден"
    text="Возможно, аккаунт удалён или ссылка неверна."
  />

  <div v-else-if="profile" class="stack">
    <section class="card profile">
      <div class="cover" />
      <div class="top">
        <UserAvatar :name="profile.name" :seed="profile.username" :size="104" class="avatar" />
        <div class="actions">
          <RouterLink v-if="isMe" :to="{ name: 'settings' }" class="btn btn-secondary btn-sm">
            <Settings :size="16" /> Редактировать
          </RouterLink>
          <template v-else>
            <RouterLink
              :to="{ name: 'messages', params: { userId: profile.id } }"
              class="icon-btn bordered"
              aria-label="Написать сообщение"
            >
              <MessageCircle :size="18" />
            </RouterLink>
            <FollowButton
              :user-id="profile.id"
              :following="profile.isFollowing"
              @change="onFollowChange"
            />
          </template>
        </div>
      </div>

      <div class="info">
        <h2 class="name">
          {{ profile.name }}
          <BadgeCheck v-if="profile.role === 'admin'" :size="20" class="verified" />
        </h2>
        <div class="subtle handle">
          @{{ profile.username }}
          <span v-if="profile.followsYou" class="follows-you">подписан на вас</span>
        </div>
        <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>
        <p class="subtle joined"><CalendarDays :size="15" /> {{ joinedAt(profile.createdAt) }}</p>
        <div class="counts">
          <RouterLink
            :to="{ name: 'people', query: { tab: 'following', user: profile.username } }"
            data-testid="following-count"
          >
            <strong>{{ profile.followingCount }}</strong>
            {{ plural(profile.followingCount, ['подписка', 'подписки', 'подписок']) }}
          </RouterLink>
          <RouterLink
            :to="{ name: 'people', query: { tab: 'followers', user: profile.username } }"
            data-testid="followers-count"
          >
            <strong>{{ profile.followersCount }}</strong>
            {{ plural(profile.followersCount, ['подписчик', 'подписчика', 'подписчиков']) }}
          </RouterLink>
        </div>
      </div>
    </section>

    <PostComposer v-if="isMe" @created="onCreated" />
    <PostList
      ref="list"
      :author="profile.id"
      :empty-title="isMe ? 'Ты ещё ничего не публиковал' : 'Постов пока нет'"
      :empty-text="isMe ? 'Напиши первый пост — его увидят подписчики.' : undefined"
    />
  </div>

  <div v-else class="card skeleton" style="height: 280px" />
</template>

<style scoped>
.profile {
  overflow: hidden;
}
.cover {
  height: 140px;
  background: linear-gradient(120deg, var(--accent), #a855f7 60%, #ec4899);
}
.top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 20px;
  margin-top: -52px;
}
.avatar {
  border: 5px solid var(--surface);
  box-sizing: content-box;
}
.actions {
  display: flex;
  gap: 8px;
  padding-bottom: 8px;
}
.bordered {
  border: 1px solid var(--border);
  width: 40px;
  height: 40px;
}
.info {
  padding: 12px 20px 20px;
}
.name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  letter-spacing: -0.01em;
}
.verified {
  color: var(--accent);
}
.handle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.follows-you {
  padding: 1px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  font-size: 12px;
}
.bio {
  margin-top: 12px;
  font-size: 15px;
}
.joined {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}
.counts {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  color: var(--text-2);
  font-size: 14px;
}
.counts a:hover {
  text-decoration: underline;
}
.counts strong {
  color: var(--text);
}
</style>
