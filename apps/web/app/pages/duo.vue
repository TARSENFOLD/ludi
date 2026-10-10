<script setup lang="ts">
import type { LudiView } from '@doot-games/sdk/ludi'
import { ludiActionId } from '../utils/ludi-session'
import '../assets/ludi.css'
useHead({ title: 'Entre Nós · Ludi', htmlAttrs: { lang: 'pt-PT' } })
const name = ref('')
const busy = ref(false)
const error = ref('')
let request: { name: string; id: string } | undefined
async function createRoom() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    if (!request || request.name !== name.value) request = { name: name.value, id: ludiActionId() }
    const view = await $fetch<LudiView>('/api/ludi/rooms', { method: 'POST', body: request })
    await navigateTo(`/ludi/salas/${view.code}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } }).data?.message ?? 'Não foi possível criar a sala. Tenta novamente.'
  } finally { busy.value = false }
}
</script>
<template>
  <main class="ludi-page">
    <header class="ludi-top"><NuxtLink to="/ludi">Ludi</NuxtLink><span>Um aparelho por pessoa</span></header>
    <form class="ludi-card ludi-narrow" @submit.prevent="createRoom">
      <p class="ludi-eyebrow">Entre Nós · 2 pessoas · cerca de 5 min</p>
      <h1>Uma pausa a dois.</h1><p>Quatro rondas de escolhas e desafios. Cria a sala e envia o convite à outra pessoa.</p>
      <label for="name">Como te chamas?</label><input id="name" v-model="name" autocomplete="nickname" maxlength="32" required :disabled="busy">
      <p v-if="error" role="alert">{{ error }}</p><button class="ludi-primary" :disabled="busy || !name.trim()">{{ busy ? 'A criar…' : 'Criar sala' }} <span aria-hidden="true">→</span></button>
      <p class="ludi-small">Sem conta. Podes voltar ao convite neste browser para retomar. A sala termina após oito horas ou se o servidor reiniciar.</p>
    </form>
  </main>
</template>
