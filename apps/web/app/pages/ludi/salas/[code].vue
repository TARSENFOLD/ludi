<script setup lang="ts">
import type { LudiView } from "@doot-games/games/ludi/contracts";
import { seenQuestionIds } from '../../../utils/ludi-question-history'
import { RoomSession, type ConnectionState } from '../../../utils/ludi-session'
import '../../../assets/ludi.css'
useHead({ title: 'Sala · Ludi', htmlAttrs: { lang: 'pt-PT' } })
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
  try { attach(await $fetch<LudiView>(`/api/ludi/rooms/${code.value}/join`, { method: 'POST', body: { name: name.value, seenQuestionIds: seenQuestionIds() } })) }
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
  <main v-else class="ludi-page">
    <LudiHeader context="A tua sala" />
    <form class="ludi-narrow ludi-setup" :aria-busy="busy" @submit.prevent="join">
      <div class="ludi-form-heading">

        <p class="ludi-eyebrow">Sala {{ code }}</p>
        <h1>{{ expired ? 'Esta sala terminou.' : busy ? 'Já te pomos na conversa.' : 'Falta só chegar.' }}</h1>
        <p v-if="busy" class="ludi-lead" role="status">A ligar à sala…</p>
        <p v-else-if="expired" class="ludi-lead">Uma nova sala, outra boa conversa.</p>
        <p v-else class="ludi-lead">O convite está contigo. Entra para jogar.</p>
      </div>
      <p v-if="error" class="ludi-error" role="alert">{{ error }}</p>
      <template v-if="!expired && !busy">
        <label for="name">Como te chamas?</label><input id="name" v-model="name" placeholder="O teu nome" maxlength="32" autocomplete="nickname" required>
        <button class="ludi-primary" :disabled="!name.trim()">Entrar na sala <span aria-hidden="true">→</span></button>
        <details class="ludi-form-details"><summary>Já estavas a jogar?</summary><p>Usa o mesmo browser onde entraste para recuperar a tua participação. O nome é apenas a forma como apareces no jogo.</p><button type="button" class="ludi-text-button" @click="resume">Tentar retomar neste browser</button></details>
      </template>
      <NuxtLink v-if="expired" class="ludi-primary" to="/ludi">Escolher um jogo <span aria-hidden="true">→</span></NuxtLink>
    </form>
  </main>
</template>
