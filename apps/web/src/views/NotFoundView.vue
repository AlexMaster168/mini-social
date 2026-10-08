<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <p class="code">404</p>
    <h1>Страница не найдена</h1>
    <p class="muted">Похоже, такой страницы нет или она переехала.</p>
    <RouterLink :to="{ name: 'feed' }" class="btn btn-primary">На главную</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 70vh;
  padding: 24px;
  text-align: center;
}
.code {
  font-size: 96px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(120deg, var(--accent), #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
h1 {
  font-size: 24px;
}
.btn {
  margin-top: 12px;
}
</style>
