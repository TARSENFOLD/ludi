<script setup lang="ts">
import type { LudiView } from "@doot-games/games/ludi/contracts";
import { ludiActionId } from '../utils/ludi-session'
import '../assets/ludi.css'
const props = defineProps<{ gameId: 'entre-nos' | 'na-mesma-onda' }>()
const onda = computed(() => props.gameId === 'na-mesma-onda')
const title = computed(() => onda.value ? 'Na Mesma Onda' : 'Entre Nós')
useHead(() => ({ title: `${title.value} · Ludi`, htmlAttrs: { lang: 'pt-PT' } }))
const name = ref('')
const busy = ref(false)
const error = ref('')
let request: { name: string; id: string; gameId: string } | undefined
async function createRoom() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    if (!request || request.name !== name.value || request.gameId !== props.gameId) request = { name: name.value, id: ludiActionId(), gameId: props.gameId }
    const view = await $fetch<LudiView>('/api/ludi/rooms', { method: 'POST', body: request })
    await navigateTo(`/ludi/salas/${view.code}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } }).data?.message ?? 'Não foi possível criar a sala. Tenta novamente.'
  } finally { busy.value = false }
}
</script>
<template>
  <main class="ludi-page">
    <LudiHeader :context="title" />
    <form class="ludi-narrow ludi-setup" :aria-busy="busy" @submit.prevent="createRoom">
      <div class="ludi-form-heading">
        <LudiGameMark :game="gameId" />
        <p class="ludi-eyebrow">{{ onda ? '2–6 pessoas · cerca de 6 min' : '2 pessoas · cerca de 5 min' }}</p>
        <h1>{{ onda ? 'Estão na mesma onda?' : 'Uma pausa a dois.' }}</h1>
        <p class="ludi-lead">{{ onda ? 'Seis temas, uma escala. Cada um escolhe, depois descobrem a sintonia do grupo.' : 'Cria a sala, envia o convite. Quatro rondas para descobrir o que vos liga.' }}</p>
      </div>
      <p v-if="onda" class="ludi-small">Sem resposta certa e sem pressa. A dois, contam os pontos da dupla; em grupo, a proximidade à média.</p>
      <label for="name">Como te chamas?</label>
      <input id="name" v-model="name" placeholder="O teu nome" autocomplete="nickname" maxlength="32" required :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? 'create-error' : undefined">
      <p v-if="error" id="create-error" class="ludi-error" role="alert">{{ error }}</p>
      <button class="ludi-primary" :disabled="busy || !name.trim()"><span>{{ busy ? 'A criar a sala…' : 'Criar sala' }}</span><span aria-hidden="true">→</span></button>
      <p class="ludi-small ludi-form-note">Sem conta. Um aparelho por pessoa.</p>
      <details class="ludi-form-details"><summary>E se eu sair a meio?</summary><p>Volta ao convite neste browser para retomar. A sala dura até oito horas e termina se o servidor reiniciar.</p></details>
    </form>
  </main>
</template>
