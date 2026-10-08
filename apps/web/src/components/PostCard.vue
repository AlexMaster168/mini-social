<script setup lang="ts">
import { BadgeCheck, Heart, MessageCircle, Pencil, Trash2 } from '@lucide/vue'
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Post } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { relativeTime } from '@/utils/format'
import UserAvatar from './UserAvatar.vue'

const props = defineProps<{ post: Post }>()
const emit = defineEmits<{ updated: [post: Post]; removed: [id: string] }>()

const auth = useAuthStore()
const toast = useToastStore()
const isMine = computed(() => props.post.author.id === auth.user?.id)

const editing = ref(false)
const confirmingDelete = ref(false)
const draft = ref('')
const busy = ref(false)
const editor = ref<HTMLTextAreaElement>()

async function toggleLike() {
  const { post } = props
  // Optimistic update; the server response is the source of truth.
  emit('updated', {
    ...post,
    likedByMe: !post.likedByMe,
    likesCount: post.likesCount + (post.likedByMe ? -1 : 1),
  })
  try {
    const res = post.likedByMe ? await api.posts.unlike(post.id) : await api.posts.like(post.id)
    emit('updated', res.post)
  } catch (error) {
    emit('updated', post)
    toast.error(error)
  }
}

async function startEdit() {
  draft.value = props.post.text
  editing.value = true
  await nextTick()
  editor.value?.focus()
}

async function saveEdit() {
  const text = draft.value.trim()
  if (!text || text === props.post.text) {
    editing.value = false
    return
  }
  busy.value = true
  try {
    const res = await api.posts.update(props.post.id, text)
    emit('updated', res.post)
    editing.value = false
  } catch (error) {
    toast.error(error)
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await api.posts.remove(props.post.id)
    emit('removed', props.post.id)
    toast.success('Пост удалён')
  } catch (error) {
    toast.error(error)
    busy.value = false
  }
}
</script>

<template>
  <article class="post card" data-testid="post">
    <RouterLink :to="{ name: 'profile', params: { username: post.author.username } }">
      <UserAvatar :name="post.author.name" :seed="post.author.username" />
    </RouterLink>

    <div class="body">
      <header class="head">
        <RouterLink
          :to="{ name: 'profile', params: { username: post.author.username } }"
          class="author"
        >
          <span class="name">{{ post.author.name }}</span>
          <BadgeCheck v-if="post.author.role === 'admin'" :size="16" class="verified" />
          <span class="subtle">@{{ post.author.username }}</span>
        </RouterLink>
        <span class="subtle">·</span>
        <time
          class="subtle"
          :datetime="post.createdAt"
          :title="new Date(post.createdAt).toLocaleString('ru-RU')"
        >
          {{ relativeTime(post.createdAt) }}
        </time>
        <span v-if="post.editedAt" class="subtle">· изменён</span>

        <div v-if="isMine && confirmingDelete" class="owner-actions confirm">
          <span class="subtle">Удалить пост?</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="confirmingDelete = false">
            Нет
          </button>
          <button
            type="button"
            class="btn btn-danger btn-sm"
            :disabled="busy"
            data-testid="confirm-delete"
            @click="remove"
          >
            Удалить
          </button>
        </div>
        <div v-else-if="isMine && !editing" class="owner-actions">
          <button type="button" class="icon-btn" aria-label="Редактировать" @click="startEdit">
            <Pencil :size="16" />
          </button>
          <button
            type="button"
            class="icon-btn danger"
            aria-label="Удалить"
            @click="confirmingDelete = true"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </header>

      <form v-if="editing" class="edit" @submit.prevent="saveEdit">
        <textarea
          ref="editor"
          v-model="draft"
          class="input"
          rows="3"
          maxlength="500"
          @keydown.esc="editing = false"
        />
        <div class="edit-actions">
          <button type="button" class="btn btn-ghost btn-sm" @click="editing = false">
            Отмена
          </button>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="busy || !draft.trim()">
            Сохранить
          </button>
        </div>
      </form>
      <p v-else class="text">{{ post.text }}</p>

      <footer class="actions">
        <button
          type="button"
          class="action like"
          :class="{ liked: post.likedByMe }"
          :aria-pressed="post.likedByMe"
          :aria-label="post.likedByMe ? 'Убрать лайк' : 'Нравится'"
          data-testid="like"
          @click="toggleLike"
        >
          <Heart :size="18" :fill="post.likedByMe ? 'currentColor' : 'none'" />
          <span>{{ post.likesCount }}</span>
        </button>
        <RouterLink
          v-if="!isMine"
          :to="{ name: 'messages', params: { userId: post.author.id } }"
          class="action"
          aria-label="Написать автору"
        >
          <MessageCircle :size="18" />
        </RouterLink>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.post {
  display: flex;
  gap: 12px;
  padding: 16px 18px 10px;
}
.body {
  flex: 1;
  min-width: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 24px;
}
.author {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.name {
  font-weight: 700;
}
.author:hover .name {
  text-decoration: underline;
}
.verified {
  color: var(--accent);
}
.owner-actions {
  margin-left: auto;
  display: flex;
  margin-top: -6px;
  margin-right: -8px;
  opacity: 0.7;
}
.post:hover .owner-actions,
.owner-actions.confirm {
  opacity: 1;
}
.owner-actions.confirm {
  align-items: center;
  gap: 6px;
  margin-top: 0;
  margin-right: 0;
}
.icon-btn {
  width: 32px;
  height: 32px;
}
.icon-btn.danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
.text {
  margin-top: 4px;
  font-size: 15.5px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.edit {
  margin-top: 8px;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  margin-left: -8px;
}
.action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 600;
  transition:
    background 0.15s,
    color 0.15s;
}
.action:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.like:hover,
.like.liked {
  color: var(--like);
}
.like:hover {
  background: var(--like-soft);
}
.like.liked svg {
  animation: pop 0.25s ease;
}
@keyframes pop {
  50% {
    transform: scale(1.25);
  }
}
@media (max-width: 520px) {
  .author .subtle {
    display: none;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
