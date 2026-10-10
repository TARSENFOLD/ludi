<script setup lang="ts">
import type { Participant } from '@doot-games/sdk/ludi'
const props = defineProps<{ code: string; players: Participant[]; me?: string; lobby: boolean }>()
const invite = ref('')
const feedback = ref('')
let resetTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { invite.value = `${location.origin}/ludi/salas/${props.code}` })
watch(() => props.code, (code) => { if (import.meta.client) invite.value = `${location.origin}/ludi/salas/${code}` })
onBeforeUnmount(() => clearTimeout(resetTimer))
async function copyInvite() {
  clearTimeout(resetTimer)
  try {
    await navigator.clipboard.writeText(invite.value)
    feedback.value = 'Convite copiado. É só enviar!'
    resetTimer = setTimeout(() => { feedback.value = '' }, 5000)
  } catch { feedback.value = 'Não foi possível copiar. Seleciona o endereço abaixo e copia-o.' }
}
</script>
<template>
  <aside class="ludi-room-info" :class="{ 'is-lobby': lobby }">
    <details :open="lobby">
      <summary><span>Sala <strong>{{ code }}</strong></span><span class="ludi-room-count">{{ players.length }}/2 pessoas <span aria-hidden="true">⌄</span></span></summary>
      <div class="ludi-room-content">
        <LudiRoster :players="players" :me="me" :waiting="players.length < 2" />
        <div class="ludi-invite">
          <p class="ludi-eyebrow">O convite está pronto</p>
          <button class="ludi-secondary" @click="copyInvite">Copiar convite <span aria-hidden="true">↗</span></button>
          <p class="ludi-copy-feedback" role="status">{{ feedback }}</p>
          <label class="sr-only" :for="`invite-${code}`">Endereço do convite</label>
          <input :id="`invite-${code}`" :value="invite" readonly @focus="($event.target as HTMLInputElement).select()">
          <p class="ludi-small">Envia à outra pessoa. Cada um joga no seu aparelho.</p>
        </div>
        <p class="ludi-small ludi-room-retention">Podes voltar a este link no mesmo browser. A sala dura até oito horas ou até o servidor reiniciar.</p>
      </div>
    </details>
  </aside>
</template>
