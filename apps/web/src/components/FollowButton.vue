<script setup lang="ts">
import { UserCheck, UserPlus } from '@lucide/vue'
import { ref } from 'vue'
import { api } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ userId: string; following: boolean; size?: 'sm'; iconOnly?: boolean }>()
const emit = defineEmits<{ change: [following: boolean] }>()

const toast = useToastStore()
const busy = ref(false)
const hover = ref(false)

async function toggle() {
  busy.value = true
  const next = !props.following
  try {
    if (next) await api.users.follow(props.userId)
    else await api.users.unfollow(props.userId)
    emit('change', next)
  } catch (error) {
    toast.error(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="btn follow"
    :class="[
      following ? 'btn-secondary' : 'btn-primary',
      size === 'sm' && 'btn-sm',
      iconOnly && 'icon-only',
    ]"
    :disabled="busy"
    :aria-label="iconOnly ? (following ? 'Отписаться' : 'Подписаться') : undefined"
    :title="iconOnly ? (following ? 'Отписаться' : 'Подписаться') : undefined"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
    @click.prevent.stop="toggle"
  >
    <template v-if="following">
      <UserCheck :size="16" />
      <template v-if="!iconOnly">{{ hover ? 'Отписаться' : 'Вы подписаны' }}</template>
    </template>
    <template v-else>
      <UserPlus :size="16" />
      <template v-if="!iconOnly">Подписаться</template>
    </template>
  </button>
</template>

<style scoped>
.follow {
  min-width: 132px;
}
.follow.icon-only {
  min-width: 0;
  width: 34px;
  padding: 0;
}
.btn-secondary:hover {
  color: var(--danger);
  border-color: var(--danger);
}
</style>
