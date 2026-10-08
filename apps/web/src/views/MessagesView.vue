<script setup lang="ts">
import { ArrowLeft, MessagesSquare, Send } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/api/client'
import type { Conversation, Message, PublicUser } from '@/api/types'
import EmptyState from '@/components/EmptyState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCountersStore } from '@/stores/counters'
import { useToastStore } from '@/stores/toast'
import { clockTime, relativeTime } from '@/utils/format'

const POLL_INTERVAL = 5000

const route = useRoute()
const auth = useAuthStore()
const counters = useCountersStore()
const toast = useToastStore()

const conversations = ref<Conversation[]>([])
const partner = ref<Pick<PublicUser, 'id' | 'name' | 'username'> | null>(null)
const messages = ref<Message[]>([])
const draft = ref('')
const sending = ref(false)
const loadingDialog = ref(false)
const scroller = ref<HTMLElement>()
let timer: ReturnType<typeof setInterval> | undefined

const partnerId = computed(() =>
  typeof route.params.userId === 'string' && route.params.userId ? route.params.userId : null,
)

async function loadConversations() {
  try {
    conversations.value = (await api.messages.conversations()).items
  } catch (error) {
    toast.error(error)
  }
}

async function scrollToBottom() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
}

async function loadDialog(showLoader: boolean) {
  const id = partnerId.value
  if (!id) return
  if (showLoader) loadingDialog.value = true
  try {
    const res = await api.messages.history(id)
    if (id !== partnerId.value) return
    const grew = res.items.length !== messages.value.length
    partner.value = res.partner
    messages.value = res.items
    if (grew) await scrollToBottom()
  } catch (error) {
    if (showLoader) toast.error(error)
  } finally {
    loadingDialog.value = false
  }
}

async function refresh() {
  await Promise.all([loadDialog(false), loadConversations()])
  await counters.refresh()
}

async function send() {
  const text = draft.value.trim()
  if (!text || !partnerId.value || sending.value) return
  sending.value = true
  try {
    const { message } = await api.messages.send(partnerId.value, text)
    messages.value.push(message)
    draft.value = ''
    await scrollToBottom()
    void loadConversations()
  } catch (error) {
    toast.error(error)
  } finally {
    sending.value = false
  }
}

watch(
  partnerId,
  async () => {
    messages.value = []
    partner.value = null
    await loadDialog(true)
    await Promise.all([loadConversations(), counters.refresh()])
  },
  { immediate: true },
)

onMounted(() => {
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void refresh()
  }, POLL_INTERVAL)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="messenger card" :class="{ 'has-dialog': partnerId }">
    <aside class="conversations">
      <header class="pane-head">
        <h1>Сообщения</h1>
      </header>
      <ul v-if="conversations.length">
        <li v-for="item in conversations" :key="item.partner.id">
          <RouterLink
            :to="{ name: 'messages', params: { userId: item.partner.id } }"
            class="conversation"
            :class="{ active: item.partner.id === partnerId }"
          >
            <UserAvatar :name="item.partner.name" :seed="item.partner.username" :size="46" />
            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-name">{{ item.partner.name }}</span>
                <span class="subtle">{{ relativeTime(item.lastMessage.createdAt) }}</span>
              </div>
              <div class="conv-bottom">
                <span class="conv-last" :class="{ unread: item.unread > 0 }">
                  <template v-if="item.lastMessage.senderId === auth.user?.id">Вы: </template>
                  {{ item.lastMessage.text }}
                </span>
                <span v-if="item.unread > 0" class="badge">{{ item.unread }}</span>
              </div>
            </div>
          </RouterLink>
        </li>
      </ul>
      <p v-else class="muted no-conv">
        Диалогов пока нет. Открой профиль человека и нажми «Написать».
      </p>
    </aside>

    <section class="dialog">
      <template v-if="partnerId && partner">
        <header class="pane-head dialog-head">
          <RouterLink :to="{ name: 'messages' }" class="icon-btn back" aria-label="К диалогам">
            <ArrowLeft :size="20" />
          </RouterLink>
          <RouterLink
            :to="{ name: 'profile', params: { username: partner.username } }"
            class="partner"
          >
            <UserAvatar :name="partner.name" :seed="partner.username" :size="38" />
            <div>
              <div class="conv-name">{{ partner.name }}</div>
              <div class="subtle">@{{ partner.username }}</div>
            </div>
          </RouterLink>
        </header>

        <div ref="scroller" class="messages">
          <p v-if="messages.length === 0" class="muted hint">
            Напиши первое сообщение — {{ partner.name }} его увидит.
          </p>
          <div
            v-for="message in messages"
            :key="message.id"
            class="bubble"
            :class="message.senderId === auth.user?.id ? 'mine' : 'theirs'"
          >
            <span class="bubble-text">{{ message.text }}</span>
            <time class="bubble-time" :datetime="message.createdAt">{{
              clockTime(message.createdAt)
            }}</time>
          </div>
        </div>

        <form class="composer" @submit.prevent="send">
          <label for="message" class="sr-only">Сообщение</label>
          <input
            id="message"
            v-model="draft"
            class="input"
            placeholder="Сообщение…"
            maxlength="1000"
            autocomplete="off"
            data-testid="message-input"
          />
          <button
            type="submit"
            class="btn btn-primary send"
            :disabled="!draft.trim() || sending"
            aria-label="Отправить"
          >
            <Send :size="18" />
          </button>
        </form>
      </template>

      <div v-else-if="loadingDialog" class="placeholder" />

      <EmptyState
        v-else
        class="placeholder"
        :icon="MessagesSquare"
        title="Выбери диалог"
        text="Выбери переписку слева или начни новую из профиля пользователя."
      />
    </section>
  </div>
</template>

<style scoped>
.messenger {
  display: grid;
  grid-template-columns: 340px 1fr;
  height: calc(100vh - 40px);
  min-height: 480px;
  overflow: hidden;
}
.conversations {
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.pane-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.pane-head h1 {
  font-size: 20px;
  font-weight: 800;
}
.conversation {
  display: flex;
  gap: 12px;
  padding: 12px 18px;
  transition: background 0.15s;
}
.conversation:hover {
  background: var(--surface-hover);
}
.conversation.active {
  background: var(--accent-soft);
}
.conv-info {
  flex: 1;
  min-width: 0;
}
.conv-top,
.conv-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.conv-name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-last {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--text-2);
}
.conv-last.unread {
  color: var(--text);
  font-weight: 600;
}
.no-conv {
  padding: 24px 18px;
  font-size: 14px;
}
.dialog {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.back {
  display: none;
}
.partner {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.3;
}
.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  overflow-y: auto;
  background: var(--bg);
}
.hint {
  margin: auto;
  text-align: center;
}
.bubble {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: min(75%, 520px);
  padding: 9px 14px;
  border-radius: 18px;
  font-size: 15px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.bubble.mine {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.bubble.theirs {
  align-self: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: 6px;
}
.bubble-time {
  flex-shrink: 0;
  font-size: 11px;
  opacity: 0.7;
}
.composer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--border);
}
.composer .input {
  border-radius: 999px;
}
.send {
  width: 44px;
  height: 44px;
  padding: 0;
}
.placeholder {
  flex: 1;
  margin: 24px;
  border: none;
  box-shadow: none;
  justify-content: center;
}

@media (max-width: 900px) {
  .messenger {
    grid-template-columns: 1fr;
    height: calc(100vh - 110px);
  }
  .messenger.has-dialog .conversations,
  .messenger:not(.has-dialog) .dialog {
    display: none;
  }
  .conversations {
    border-right: none;
  }
  .back {
    display: inline-grid;
  }
}
</style>
