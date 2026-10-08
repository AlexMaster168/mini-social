<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import { useFormErrors } from '@/composables/useFormErrors'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const profile = reactive({
  name: auth.user?.name ?? '',
  username: auth.user?.username ?? '',
  email: auth.user?.email ?? '',
  bio: auth.user?.bio ?? '',
})
const profileErrors = useFormErrors()
const savingProfile = ref(false)

async function saveProfile() {
  profileErrors.reset()
  savingProfile.value = true
  try {
    const { user } = await api.users.updateMe(profile)
    auth.setUser(user)
    toast.success('Профиль сохранён')
  } catch (error) {
    profileErrors.apply(error)
  } finally {
    savingProfile.value = false
  }
}

const passwords = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const passwordErrors = useFormErrors()
const savingPassword = ref(false)

async function changePassword() {
  passwordErrors.reset()
  if (passwords.newPassword !== passwords.confirm) {
    passwordErrors.fieldErrors.value.confirm = 'Пароли не совпадают'
    return
  }
  savingPassword.value = true
  try {
    await api.users.changePassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    })
    Object.assign(passwords, { currentPassword: '', newPassword: '', confirm: '' })
    toast.success('Пароль изменён')
  } catch (error) {
    passwordErrors.apply(error)
  } finally {
    savingPassword.value = false
  }
}

const deletePassword = ref('')
const deleteErrors = useFormErrors()
const deleting = ref(false)

async function deleteAccount() {
  deleteErrors.reset()
  deleting.value = true
  try {
    await api.users.deleteMe(deletePassword.value)
    auth.setUser(null)
    toast.success('Аккаунт удалён')
    await router.replace({ name: 'register' })
  } catch (error) {
    deleteErrors.apply(error)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <PageHeader title="Настройки" />

  <div class="stack">
    <form class="card section" novalidate @submit.prevent="saveProfile">
      <h2>Профиль</h2>
      <p v-if="profileErrors.formError.value" class="form-error">
        {{ profileErrors.formError.value }}
      </p>
      <div class="grid">
        <div class="field">
          <label for="name">Имя</label>
          <input id="name" v-model="profile.name" class="input" autocomplete="name" />
          <span v-if="profileErrors.fieldErrors.value.name" class="field-error">{{
            profileErrors.fieldErrors.value.name
          }}</span>
        </div>
        <div class="field">
          <label for="username">Логин</label>
          <input id="username" v-model="profile.username" class="input" autocomplete="username" />
          <span v-if="profileErrors.fieldErrors.value.username" class="field-error">{{
            profileErrors.fieldErrors.value.username
          }}</span>
        </div>
      </div>
      <div class="field">
        <label for="email">E-mail</label>
        <input id="email" v-model="profile.email" class="input" type="email" autocomplete="email" />
        <span v-if="profileErrors.fieldErrors.value.email" class="field-error">{{
          profileErrors.fieldErrors.value.email
        }}</span>
      </div>
      <div class="field">
        <label for="bio">О себе</label>
        <textarea id="bio" v-model="profile.bio" class="input" rows="3" maxlength="160" />
        <span class="subtle">{{ profile.bio.length }}/160</span>
      </div>
      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="savingProfile">Сохранить</button>
      </div>
    </form>

    <form class="card section" novalidate @submit.prevent="changePassword">
      <h2>Пароль</h2>
      <p v-if="passwordErrors.formError.value" class="form-error">
        {{ passwordErrors.formError.value }}
      </p>
      <div class="field">
        <label for="current">Текущий пароль</label>
        <input
          id="current"
          v-model="passwords.currentPassword"
          class="input"
          type="password"
          autocomplete="current-password"
        />
      </div>
      <div class="grid">
        <div class="field">
          <label for="new">Новый пароль</label>
          <input
            id="new"
            v-model="passwords.newPassword"
            class="input"
            type="password"
            autocomplete="new-password"
          />
          <span v-if="passwordErrors.fieldErrors.value.newPassword" class="field-error">{{
            passwordErrors.fieldErrors.value.newPassword
          }}</span>
        </div>
        <div class="field">
          <label for="confirm">Повтори пароль</label>
          <input
            id="confirm"
            v-model="passwords.confirm"
            class="input"
            type="password"
            autocomplete="new-password"
          />
          <span v-if="passwordErrors.fieldErrors.value.confirm" class="field-error">{{
            passwordErrors.fieldErrors.value.confirm
          }}</span>
        </div>
      </div>
      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="savingPassword">
          Сменить пароль
        </button>
      </div>
    </form>

    <form class="card section danger-zone" novalidate @submit.prevent="deleteAccount">
      <h2>Удаление аккаунта</h2>
      <p class="muted">
        Все посты, лайки, подписки и сообщения будут удалены без возможности восстановления.
      </p>
      <p v-if="deleteErrors.formError.value" class="form-error">
        {{ deleteErrors.formError.value }}
      </p>
      <div class="field">
        <label for="delete-password">Пароль для подтверждения</label>
        <input
          id="delete-password"
          v-model="deletePassword"
          class="input"
          type="password"
          autocomplete="current-password"
        />
      </div>
      <div class="actions">
        <button type="submit" class="btn btn-danger" :disabled="deleting || !deletePassword">
          Удалить аккаунт
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.section {
  padding: 22px;
}
.section h2 {
  font-size: 17px;
  margin-bottom: 16px;
}
.section > .form-error {
  margin-bottom: 14px;
}
.section > .muted {
  margin: -8px 0 16px;
  font-size: 14px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.grid .field + .field {
  margin-top: 0;
}
.grid + .field {
  margin-top: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
.danger-zone h2 {
  color: var(--danger);
}
@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
