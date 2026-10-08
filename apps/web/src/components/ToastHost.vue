<script setup lang="ts">
import { CircleAlert, CircleCheck, X } from '@lucide/vue'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in toast.toasts"
        :key="item.id"
        class="toast"
        :class="item.kind"
        role="status"
      >
        <CircleCheck v-if="item.kind === 'success'" :size="18" />
        <CircleAlert v-else :size="18" />
        <span>{{ item.text }}</span>
        <button type="button" class="close" aria-label="Закрыть" @click="toast.dismiss(item.id)">
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: calc(100vw - 40px);
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--text);
  color: var(--bg);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 500;
}
.toast.success svg:first-child {
  color: #4ade80;
}
.toast.error svg:first-child {
  color: #f87171;
}
.close {
  display: grid;
  color: inherit;
  opacity: 0.6;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 720px) {
  .toasts {
    bottom: 84px;
    right: 12px;
  }
}
</style>
