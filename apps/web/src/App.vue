<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import ToastHost from '@/components/ToastHost.vue'
import { useAuthStore } from '@/stores/auth'
import { useCountersStore } from '@/stores/counters'

const route = useRoute()
const auth = useAuthStore()
const counters = useCountersStore()

watch(
  () => auth.isAuthenticated,
  (signedIn) => (signedIn ? counters.start() : counters.stop()),
  { immediate: true },
)
</script>

<template>
  <AppLayout v-if="auth.isAuthenticated && !route.meta.guestOnly" :wide="route.meta.wide">
    <RouterView :key="route.name === 'profile' ? route.fullPath : undefined" />
  </AppLayout>
  <RouterView v-else-if="auth.initialized" />
  <ToastHost />
</template>
