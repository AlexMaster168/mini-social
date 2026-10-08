<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import RightRail from './RightRail.vue'

defineProps<{ wide?: boolean }>()
</script>

<template>
  <div class="layout" :class="{ wide }">
    <AppSidebar />
    <main class="layout-main">
      <slot />
    </main>
    <RightRail v-if="!wide" class="layout-rail" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 620px) 320px;
  justify-content: center;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
}
.layout.wide {
  grid-template-columns: 250px minmax(0, 966px);
}
.layout-main {
  padding: 20px 0 48px;
  min-width: 0;
}
.layout-rail {
  padding: 20px 0;
}

@media (max-width: 1180px) {
  .layout,
  .layout.wide {
    grid-template-columns: 84px minmax(0, 640px);
  }
  .layout.wide {
    grid-template-columns: 84px minmax(0, 1fr);
  }
  .layout-rail {
    display: none;
  }
}

@media (max-width: 720px) {
  .layout,
  .layout.wide {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 12px;
  }
  .layout-main {
    padding: 12px 0 88px;
  }
}
</style>
