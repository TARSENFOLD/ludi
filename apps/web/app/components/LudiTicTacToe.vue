<script setup lang="ts">
import type { LudiSession, LudiView } from '@doot-games/games/ludi/contracts'
import { ludiActionId, type ConnectionState } from '../utils/ludi-session'
const props = defineProps<{ view: LudiView; session: LudiSession; connection?: ConnectionState }>()
const busy = ref(false), error = ref('')
const board = computed(() => props.view.ticTacToe!)
const outcome = computed(() => board.value.outcome)
const status = computed(() => outcome.value === 'draw' ? 'Empate!' : outcome.value ? `${props.view.players[outcome.value === 'X' ? 0 : 1]?.name} venceu!` : `É a vez de ${props.view.players.find(p => p.id === board.value.turn)?.name}.`)
const move = computed(() => props.view.actions.find(a => a.type === 'answer'))
async function act(type: 'start' | 'answer' | 'replay', choice?: number) {
  if (busy.value || props.connection?.state === 'ended') return
  busy.value = true; error.value = ''
  try { await props.session.send({ id: ludiActionId(), match: props.view.match, round: props.view.round, type, ...(type === 'answer' ? { choice, stage: props.view.stage } : {}) }) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível jogar.' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="ludi-page">
    <LudiHeader context="Jogo da Velha" />
    <section class="ludi-narrow ludi-setup">
      <template v-if="connection?.state === 'ended'"><h1>A sala terminou.</h1><p>{{ connection.message }}</p><NuxtLink class="ludi-primary" to="/ludi/jogo-da-velha?modo=room">Criar outra sala</NuxtLink></template>
      <template v-else>
        <p v-if="connection?.message" role="status">{{ connection.message }}</p>
        <p class="ludi-eyebrow">Três em linha · partida {{ view.match }}</p>
        <h1 aria-live="polite">{{ view.phase === 'lobby' ? 'Quem faz três em linha?' : status }}</h1>
        <p v-if="view.phase === 'lobby'" class="ludi-lead">X começa. Alternem as jogadas e completem uma linha, coluna ou diagonal.</p>
        <p v-for="(player, i) in view.players" :key="player.id">{{ i === 0 ? 'X' : 'O' }} · {{ player.name }} · {{ view.scores?.[i]?.score ?? 0 }} vitórias</p>
        <p class="ludi-small">{{ board.draws }} empates</p>
        <div v-if="view.phase !== 'lobby'" class="ttt-board" role="group" aria-label="Tabuleiro de jogo da velha">
          <button v-for="(cell, index) in board.board" :key="index" class="ttt-cell" :class="{ 'is-o': cell === 'O' }" :aria-label="`Linha ${Math.floor(index / 3) + 1}, coluna ${index % 3 + 1}: ${cell ?? 'vazia'}`" :disabled="busy || !move?.choices?.includes(index)" @click="act('answer', index)">{{ cell }}</button>
        </div>
        <p v-if="view.phase === 'active' && !move" role="status">A aguardar a outra pessoa.</p>
        <p v-if="error" class="ludi-error" role="alert">{{ error }}</p>
        <template v-for="action in view.actions" :key="action.type"><button v-if="action.type === 'start' || action.type === 'replay'" class="ludi-primary" :disabled="busy" @click="act(action.type)">{{ action.label }}</button></template>
        <p v-if="view.phase === 'lobby' && !view.actions.length">{{ view.players.length < 2 ? 'Envia o convite para a outra pessoa entrar.' : 'Quem criou a sala pode começar.' }}</p>
        <p v-if="view.phase === 'results' && !view.actions.length">Quem criou a sala pode pedir revanche.</p>
        <LudiRoomInfo v-if="view.code" :code="view.code" :players="view.players" :me="view.context.participantId" :lobby="view.phase === 'lobby'" :max-players="2" />
      </template>
      <NuxtLink class="ludi-text-button" to="/ludi">Escolher outro jogo</NuxtLink>
    </section>
  </main>
</template>
<style scoped>
.ttt-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: min(100%, 360px); margin: 24px auto; }
.ttt-cell { aspect-ratio: 1; min-height: 64px; border: 2px solid currentColor; border-radius: 12px; background: #faf9f6; color: #283c32; font-size: clamp(2rem, 12vw, 4rem); font-weight: 700; cursor: pointer; }
.ttt-cell:disabled { opacity: 1; cursor: default; }
.ttt-cell.is-o { color: #a54730; }
.ttt-cell:focus-visible { outline: 4px solid #b55b28; outline-offset: 3px; }
.ttt-cell:enabled:hover { background: #ece8df; }
</style>
