<script setup lang="ts">
import { Heart, MessageCircle, Users } from '@lucide/vue'

defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div class="auth">
    <section class="promo">
      <div class="promo-inner">
        <div class="logo"><span class="logo-mark">M</span> Mini Social</div>
        <h2>Делись мыслями.<br />Находи своих.</h2>
        <ul class="features">
          <li><Users :size="20" /> Подписывайся на интересных людей</li>
          <li><Heart :size="20" /> Лайкай и обсуждай посты</li>
          <li><MessageCircle :size="20" /> Переписывайся в личных сообщениях</li>
        </ul>
      </div>
    </section>

    <section class="panel">
      <div class="form-wrap">
        <div class="mobile-logo"><span class="logo-mark">M</span></div>
        <h1>{{ title }}</h1>
        <p class="muted subtitle">{{ subtitle }}</p>
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}
.promo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background:
    radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.18), transparent 40%),
    linear-gradient(135deg, #4f46e5, #7c3aed 55%, #db2777);
  color: #fff;
}
.promo-inner {
  max-width: 420px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 20px;
}
.logo-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgb(255 255 255 / 0.2);
  font-size: 20px;
  font-weight: 800;
}
h2 {
  margin: 48px 0 32px;
  font-size: 44px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 17px;
}
.features li {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.92;
}
.panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: var(--surface);
}
.form-wrap {
  width: 100%;
  max-width: 380px;
}
.mobile-logo {
  display: none;
}
h1 {
  font-size: 28px;
  letter-spacing: -0.02em;
}
.subtitle {
  margin: 6px 0 28px;
}

@media (max-width: 900px) {
  .auth {
    grid-template-columns: 1fr;
  }
  .promo {
    display: none;
  }
  .mobile-logo {
    display: block;
    margin-bottom: 24px;
  }
  .mobile-logo .logo-mark {
    background: var(--accent);
    color: #fff;
  }
}
</style>
