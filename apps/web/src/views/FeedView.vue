<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Post } from '@/api/types'
import PageHeader from '@/components/PageHeader.vue'
import PostComposer from '@/components/PostComposer.vue'
import PostList from '@/components/PostList.vue'

const scope = ref<'all' | 'following'>('all')
const list = ref<InstanceType<typeof PostList>>()

function onCreated(post: Post) {
  list.value?.prepend(post)
}
</script>

<template>
  <PageHeader title="Лента">
    <div class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: scope === 'all' }"
        :aria-selected="scope === 'all'"
        @click="scope = 'all'"
      >
        Все
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: scope === 'following' }"
        :aria-selected="scope === 'following'"
        @click="scope = 'following'"
      >
        Подписки
      </button>
    </div>
  </PageHeader>

  <div class="stack">
    <PostComposer @created="onCreated" />
    <PostList
      ref="list"
      :scope="scope"
      :empty-title="scope === 'following' ? 'В подписках тихо' : 'Постов пока нет'"
      :empty-text="
        scope === 'following'
          ? 'Подпишись на людей, чтобы видеть их посты здесь.'
          : 'Стань первым, кто что-нибудь напишет!'
      "
    >
      <template v-if="scope === 'following'" #empty>
        <RouterLink :to="{ name: 'people' }" class="btn btn-primary btn-sm">Найти людей</RouterLink>
      </template>
    </PostList>
  </div>
</template>
