<script setup lang="ts">
import { computed } from 'vue'
import { avatarHue, initials } from '@/utils/format'

const props = withDefaults(defineProps<{ name: string; seed: string; size?: number }>(), {
  size: 44,
})

const style = computed(() => {
  const hue = avatarHue(props.seed)
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${Math.round(props.size * 0.38)}px`,
    background: `linear-gradient(135deg, hsl(${hue} 75% 62%), hsl(${(hue + 40) % 360} 70% 50%))`,
  }
})
</script>

<template>
  <span class="avatar" :style="style" aria-hidden="true">{{ initials(name) }}</span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.02em;
  user-select: none;
}
</style>
