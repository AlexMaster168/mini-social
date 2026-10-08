<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { useRouter } from 'vue-router'

defineProps<{ title: string; subtitle?: string; back?: boolean }>()
const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'feed' })
}
</script>

<template>
  <header class="page-header">
    <button v-if="back" type="button" class="icon-btn" aria-label="Назад" @click="goBack">
      <ArrowLeft :size="20" />
    </button>
    <div class="titles">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtle">{{ subtitle }}</p>
    </div>
    <div class="actions"><slot /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin-bottom: 16px;
}
.titles {
  flex: 1;
  min-width: 0;
}
h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.actions {
  display: flex;
  gap: 8px;
}
</style>
