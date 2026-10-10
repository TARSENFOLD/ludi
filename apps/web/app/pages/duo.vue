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
    <LudiHeader context="Entre Nós" />
    <form class="ludi-narrow ludi-setup" :aria-busy="busy" @submit.prevent="createRoom">
      <div class="ludi-form-heading">
        <LudiGameMark game="entre-nos" />
        <p class="ludi-eyebrow">2 pessoas · cerca de 5 min</p>
        <h1>Uma pausa<br>a dois.</h1>
        <p class="ludi-lead">Cria a sala, envia o convite. Quatro rondas para descobrir o que vos liga.</p>
      </div>
      <label for="name">Como te chamas?</label>
      <input id="name" v-model="name" placeholder="O teu nome" autocomplete="nickname" maxlength="32" required :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? 'create-error' : undefined">
      <p v-if="error" id="create-error" class="ludi-error" role="alert">{{ error }}</p>
      <button class="ludi-primary" :disabled="busy || !name.trim()"><span>{{ busy ? 'A criar a sala…' : 'Criar sala' }}</span><span aria-hidden="true">→</span></button>
      <p class="ludi-small ludi-form-note">Sem conta. Um aparelho por pessoa.</p>
      <details class="ludi-form-details"><summary>E se eu sair a meio?</summary><p>Volta ao convite neste browser para retomar. A sala dura até oito horas e termina se o servidor reiniciar.</p></details>
    </form>
  </main>
</template>
