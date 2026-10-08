<script setup lang="ts">
import { LoaderCircle, Send } from '@lucide/vue'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import type { Post } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import UserAvatar from './UserAvatar.vue'

const MAX = 500
const emit = defineEmits<{ created: [post: Post] }>()

const auth = useAuthStore()
const toast = useToastStore()
const text = ref('')
const busy = ref(false)

const length = computed(() => text.value.trim().length)
const canSubmit = computed(() => length.value > 0 && length.value <= MAX && !busy.value)

async function submit() {
  if (!canSubmit.value) return
  busy.value = true
  try {
    const { post } = await api.posts.create(text.value)
    emit('created', post)
    text.value = ''
  } catch (error) {
    toast.error(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form v-if="auth.user" class="composer card" @submit.prevent="submit">
    <UserAvatar :name="auth.user.name" :seed="auth.user.username" />
    <div class="body">
      <label for="composer" class="sr-only">Новый пост</label>
      <textarea
        id="composer"
        v-model="text"
        rows="3"
        :maxlength="MAX"
        placeholder="Что нового?"
        data-testid="composer"
        @keydown.ctrl.enter="submit"
        @keydown.meta.enter="submit"
      />
      <div class="footer">
        <span class="subtle" :class="{ warn: length > MAX - 50 }">{{ length }}/{{ MAX }}</span>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="!canSubmit">
          <LoaderCircle v-if="busy" :size="16" class="spinner" />
          <Send v-else :size="16" />
          Опубликовать
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
}
.body {
  flex: 1;
  min-width: 0;
}
textarea {
  width: 100%;
  min-height: 64px;
  padding: 10px 0;
  border: none;
  background: none;
  resize: none;
  font-size: 16px;
  line-height: 1.5;
}
textarea:focus {
  outline: none;
}
textarea::placeholder {
  color: var(--text-3);
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.warn {
  color: var(--danger);
}
</style>
