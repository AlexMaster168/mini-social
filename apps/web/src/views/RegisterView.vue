<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const router = useRouter()
const toast = useToastStore()
const { fieldErrors, formError, reset, apply } = useFormErrors()

const form = reactive({ name: '', username: '', email: '', password: '', confirm: '' })
const busy = ref(false)

const fields = [
  { key: 'name', label: 'Имя', type: 'text', autocomplete: 'name' },
  { key: 'username', label: 'Логин', type: 'text', autocomplete: 'username' },
  { key: 'email', label: 'E-mail', type: 'email', autocomplete: 'email' },
  { key: 'password', label: 'Пароль', type: 'password', autocomplete: 'new-password' },
  { key: 'confirm', label: 'Повтори пароль', type: 'password', autocomplete: 'new-password' },
] as const

async function submit() {
  reset()
  if (form.password !== form.confirm) {
    fieldErrors.value.confirm = 'Пароли не совпадают'
    return
  }
  busy.value = true
  try {
    const { confirm: _confirm, ...payload } = form
    await auth.register(payload)
    toast.success(`Добро пожаловать, ${form.name}!`)
    await router.replace({ name: 'feed' })
  } catch (error) {
    apply(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Создай аккаунт" subtitle="Это займёт меньше минуты">
    <form novalidate @submit.prevent="submit">
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div v-for="field in fields" :key="field.key" class="field" :class="{ mt: formError }">
        <label :for="field.key">{{ field.label }}</label>
        <input
          :id="field.key"
          v-model="form[field.key]"
          class="input"
          :type="field.type"
          :autocomplete="field.autocomplete"
          required
          :aria-invalid="!!fieldErrors[field.key]"
        />
        <span v-if="fieldErrors[field.key]" class="field-error">{{ fieldErrors[field.key] }}</span>
      </div>

      <button type="submit" class="btn btn-primary btn-block submit" :disabled="busy">
        <LoaderCircle v-if="busy" :size="18" class="spinner" />
        Зарегистрироваться
      </button>
    </form>

    <p class="muted switch">
      Уже есть аккаунт? <RouterLink :to="{ name: 'login' }" class="link">Войти</RouterLink>
    </p>
  </AuthShell>
</template>

<style scoped>
.mt:first-of-type {
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
