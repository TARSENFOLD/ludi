<script setup lang="ts">
import type { LudiView } from '@doot-games/sdk/ludi'
import { RoomSession, type ConnectionState } from '../../../utils/ludi-session'
import '../../../assets/ludi.css'
useHead({ title: 'Entre Nós · Ludi', htmlAttrs: { lang: 'pt-PT' } })
const route = useRoute()
const code = computed(() => String(route.params.code).toUpperCase())
const session = shallowRef<RoomSession>()
const name = ref('')
const busy = ref(true)
const error = ref('')
const connection = ref<ConnectionState>({ state: 'connected', message: '' })
const expired = ref(false)
function attach(view: LudiView) { session.value?.disconnect(); session.value = new RoomSession(view, (message) => { connection.value = message }) }
async function resume() {
  busy.value = true; error.value = ''; expired.value = false
  try { attach(await $fetch<LudiView>(`/api/ludi/rooms/${code.value}`)) }
  catch (e) {
    const err = e as { statusCode?: number; data?: { message?: string } }
    if (err.statusCode !== 401 && err.statusCode !== 403) error.value = err.data?.message ?? 'Não conseguimos ligar à sala. Tenta novamente.'
    expired.value = err.statusCode === 410
  } finally { busy.value = false }
}
async function join() {
  busy.value = true; error.value = ''
  try { attach(await $fetch<LudiView>(`/api/ludi/rooms/${code.value}/join`, { method: 'POST', body: { name: name.value } })) }
  catch (e) {
    const err = e as { statusCode?: number; data?: { message?: string } }
    error.value = err.data?.message ?? 'Não foi possível entrar. Tenta novamente.'
    expired.value = err.statusCode === 410
  }
  finally { busy.value = false }
}
onMounted(resume)
onBeforeUnmount(() => session.value?.disconnect())
</script>
<template>
  <LudiGame v-if="session" :session="session" :connection="connection" />
  <main v-else class="ludi-page"><header class="ludi-top"><NuxtLink to="/ludi">Ludi</NuxtLink><span>Entre Nós</span></header>
    <form class="ludi-card ludi-narrow" @submit.prevent="join"><p class="ludi-eyebrow">Sala {{ code }}</p><h1>{{ expired ? 'Esta sala terminou.' : 'Junta-te à conversa.' }}</h1>
      <p v-if="busy" role="status">A ligar à sala…</p><p v-if="error" role="alert">{{ error }}</p>
      <template v-if="!expired && !busy"><label for="name">Como te chamas?</label><input id="name" v-model="name" maxlength="32" autocomplete="nickname" required><button class="ludi-primary" :disabled="!name.trim()">Entrar na sala <span aria-hidden="true">→</span></button><button type="button" class="ludi-secondary" @click="resume">Tentar retomar neste browser</button><p class="ludi-small">Para recuperar a tua participação, usa o mesmo browser onde entraste. O nome é apenas a forma como apareces no jogo.</p></template>
      <NuxtLink v-if="expired" class="ludi-secondary" to="/duo">Criar outra sala</NuxtLink>
    </form>
  </main>
</template>
