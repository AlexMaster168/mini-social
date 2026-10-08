<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { fieldErrors, formError, reset, apply } = useFormErrors()

const form = reactive({ login: '', password: '' })
const busy = ref(false)

async function submit() {
  reset()
  busy.value = true
  try {
    await auth.login(form.login, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    // Only follow internal redirects.
    await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  } catch (error) {
    apply(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="С возвращением 👋" subtitle="Войди, чтобы увидеть ленту друзей">
    <form novalidate @submit.prevent="submit">
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div class="field" :class="{ mt: formError }">
        <label for="login">E-mail или логин</label>
        <input
          id="login"
          v-model.trim="form.login"
          class="input"
          autocomplete="username"
          required
          :aria-invalid="!!fieldErrors.login"
        />
        <span v-if="fieldErrors.login" class="field-error">{{ fieldErrors.login }}</span>
      </div>

      <div class="field">
        <label for="password">Пароль</label>
        <input
          id="password"
          v-model="form.password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
          :aria-invalid="!!fieldErrors.password"
        />
        <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
      </div>

      <button type="submit" class="btn btn-primary btn-block submit" :disabled="busy">
        <LoaderCircle v-if="busy" :size="18" class="spinner" />
        Войти
      </button>
    </form>

    <p class="muted switch">
      Нет аккаунта?
      <RouterLink :to="{ name: 'register' }" class="link">Зарегистрироваться</RouterLink>
    </p>
  </AuthShell>
</template>

<style scoped>
.mt {
  margin-top: 14px;
}
.submit {
  height: 46px;
  margin-top: 24px;
}
.switch {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
}
.link {
  color: var(--accent);
  font-weight: 600;
}
</style>
