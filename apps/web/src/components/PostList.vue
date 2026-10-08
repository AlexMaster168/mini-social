<script setup lang="ts">
import { LoaderCircle, Newspaper } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Post } from '@/api/types'
import { useToastStore } from '@/stores/toast'
import EmptyState from './EmptyState.vue'
import PostCard from './PostCard.vue'

const props = defineProps<{
  scope?: 'all' | 'following'
  author?: string
  emptyTitle?: string
  emptyText?: string
}>()

const toast = useToastStore()
const posts = ref<Post[]>([])
const cursor = ref<string | null>(null)
const loading = ref(true)
const loadingMore = ref(false)

async function load(reset: boolean) {
  if (reset) loading.value = true
  else loadingMore.value = true
  try {
    const page = await api.posts.list({
      scope: props.scope,
      author: props.author,
      cursor: reset ? null : cursor.value,
    })
    posts.value = reset ? page.items : [...posts.value, ...page.items]
    cursor.value = page.nextCursor
  } catch (error) {
    toast.error(error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function prepend(post: Post) {
  posts.value = [post, ...posts.value]
}

function onUpdated(post: Post) {
  posts.value = posts.value.map((p) => (p.id === post.id ? post : p))
}

function onRemoved(id: string) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

onMounted(() => load(true))
watch(
  () => [props.scope, props.author],
  () => load(true),
)

defineExpose({ prepend, reload: () => load(true) })
</script>

<template>
  <div class="stack">
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="card skeleton-post">
        <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%" />
        <div class="stack" style="flex: 1; gap: 8px">
          <div class="skeleton" style="width: 40%; height: 14px" />
          <div class="skeleton" style="width: 90%; height: 14px" />
          <div class="skeleton" style="width: 70%; height: 14px" />
        </div>
      </div>
    </template>

    <EmptyState
      v-else-if="posts.length === 0"
      :icon="Newspaper"
      :title="emptyTitle ?? 'Здесь пока пусто'"
      :text="emptyText"
    >
      <slot name="empty" />
    </EmptyState>

    <template v-else>
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @updated="onUpdated"
        @removed="onRemoved"
      />
      <button
        v-if="cursor"
        type="button"
        class="btn btn-secondary btn-block"
        :disabled="loadingMore"
        @click="load(false)"
      >
        <LoaderCircle v-if="loadingMore" :size="16" class="spinner" />
        Показать ещё
      </button>
    </template>
  </div>
</template>

<style scoped>
.skeleton-post {
  display: flex;
  gap: 12px;
  padding: 18px;
}
</style>
