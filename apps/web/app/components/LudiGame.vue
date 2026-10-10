<script setup lang="ts">
import type { LudiSession, LudiView } from '@doot-games/sdk/ludi'
import { ludiActionId, type ConnectionState } from '../utils/ludi-session'
const props = defineProps<{ session: LudiSession; connection?: ConnectionState }>()
const view = shallowRef<LudiView>()
const choice = ref<number | null>(null)
const busy = ref(false)
const error = ref('')
const copied = ref(false)
const invite = ref('')
let unsubscribe: (() => void) | undefined
watch(() => props.session, (session) => {
  unsubscribe?.()
  unsubscribe = session.observe((next) => {
    const old = view.value
    if (!old || next.match !== old.match || next.round !== old.round || next.context.participantId !== old.context.participantId) choice.value = null
    view.value = next
    if (next.code && import.meta.client) invite.value = `${location.origin}/ludi/salas/${next.code}`
  })
}, { immediate: true })
onUnmounted(() => { unsubscribe?.(); props.session.disconnect() })
const currentAction = computed(() => props.connection?.state === 'ended' ? undefined : view.value?.actions[0])
const me = computed(() => view.value?.players.find((p) => p.id === view.value?.context.participantId))
const answerRevealed = computed(() => view.value?.reveal?.correctIndex !== undefined)
async function act() {
  const action = currentAction.value
  const v = view.value
  if (!action || !v || busy.value) return
  busy.value = true; error.value = ''
  try {
    await props.session.send({ id: ludiActionId(), match: v.match, round: v.round, type: action.type, ...(action.type === 'answer' && choice.value !== null ? { choice: choice.value } : {}) })
  } catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível continuar.' }
  finally { busy.value = false }
}
async function copyInvite() {
  try { await navigator.clipboard.writeText(invite.value); copied.value = true }
  catch { error.value = 'Seleciona e copia o endereço do convite abaixo.' }
}
</script>

<template>
  <main v-if="view" class="ludi-page ludi-game">
    <header class="ludi-top"><NuxtLink to="/ludi">Ludi</NuxtLink><span>{{ view.title }} <template v-if="me">· {{ me.name }}</template></span></header>
    <p v-if="connection?.message" role="status" class="ludi-notice">{{ connection.message }} <NuxtLink v-if="connection.state === 'ended'" to="/duo">Criar sala</NuxtLink></p>
    <div class="ludi-game-layout" :class="{ 'is-lobby': view.phase === 'lobby' && view.code }">
      <section class="ludi-card ludi-question" aria-live="polite" aria-atomic="true">
        <template v-if="view.phase === 'lobby'">
          <p class="ludi-eyebrow">{{ view.title }}</p>
          <h1>{{ view.context.mode === 'room' ? 'Uma sala para vocês.' : 'Prontos para o desafio?' }}</h1>
          <p v-if="view.context.mode !== 'room'">Cinco perguntas. Um ponto por acerto, sem temporizador.</p>
          <p v-else-if="view.players.length < 2">Convida a outra pessoa para começar.</p>
          <p v-else>{{ view.context.permissions.control ? 'Já estão os dois aqui. Podes começar!' : 'Já estão os dois aqui. A pessoa que criou a sala pode começar.' }}</p>
        </template>
        <template v-else-if="view.handoff">
          <p class="ludi-eyebrow">Passar o aparelho · Ronda {{ view.round + 1 }} de {{ view.totalRounds }}</p>
          <h1>É a vez de {{ view.handoff.name }}.</h1>
          <p>Entrega o aparelho e toca em «Estou pronto/a» quando estiver contigo.</p>
        </template>
        <template v-else-if="view.phase === 'active' && view.content">
          <p class="ludi-eyebrow">{{ view.content.kind === 'poll' ? 'Escolha' : 'Desafio' }} · Ronda {{ view.round + 1 }} de {{ view.totalRounds }}</p>
          <h1>{{ view.content.prompt }}</h1>
          <fieldset v-if="currentAction?.type === 'answer'" class="ludi-options">
            <legend class="sr-only">Escolhe uma resposta</legend>
            <label v-for="(option, index) in view.content.options" :key="index" :class="{ selected: choice === index }">
              <input v-model="choice" type="radio" name="answer" :value="index" :disabled="busy">
              <span>{{ option }}</span>
            </label>
          </fieldset>
          <div v-else-if="view.reveal" class="ludi-reveal">
            <template v-if="answerRevealed">
              <h2>{{ view.ownChoice === view.reveal.correctIndex ? 'Acertaste!' : 'A resposta certa…' }}</h2>
              <p>{{ view.reveal.correctLabel }}</p>
            </template>
            <template v-else>
              <h2>{{ view.reveal.counts?.filter((n) => n > 0).length === 1 ? 'Em sintonia!' : 'Escolhas divididas' }}</h2>
              <p v-for="(option, i) in view.content.options" :key="i">{{ option }} <strong>{{ view.reveal.counts?.[i] ?? 0 }}</strong></p>
            </template>
          </div>
          <div v-else class="ludi-reveal">
            <h2>{{ view.roundState === 'locked' ? 'Todos responderam!' : 'Resposta confirmada' }}</h2>
            <p v-if="view.ownChoice !== undefined">Escolheste: {{ view.content.options[view.ownChoice] }}</p>
            <p>{{ view.roundState === 'locked' ? (view.context.permissions.control ? 'Podes revelar o resultado.' : 'A aguardar a revelação.') : 'A aguardar a outra pessoa…' }}</p>
          </div>
        </template>
        <template v-else-if="view.phase === 'results'">
          <p class="ludi-eyebrow">Partida concluída</p><h1>Mais uma?</h1>
          <p>{{ view.title === 'Entre Nós' ? 'As escolhas dão conversa. Os desafios dão pontos.' : 'Um ponto por cada resposta certa.' }}</p>
        </template>
        <ol v-if="view.scores" class="ludi-scores" aria-label="Pontuação">
          <li v-for="player in view.scores" :key="player.id"><span>{{ player.name }}</span><strong>{{ player.score }} {{ player.score === 1 ? 'ponto' : 'pontos' }}</strong></li>
        </ol>
        <details v-if="view.history" class="ludi-history"><summary>Rever as rondas</summary>
          <section v-for="(round, i) in view.history" :key="i"><h2>{{ round.prompt }}</h2>
            <p v-if="round.reveal.correctLabel">{{ round.reveal.correctLabel }}</p>
            <p v-for="(n, j) in round.reveal.counts" :key="j">{{ round.options[j] }} · {{ n }}</p>
          </section>
        </details>
      </section>
      <aside v-if="view.code" class="ludi-card ludi-room-info">
        <details :open="view.phase === 'lobby'"><summary>Sala <strong>{{ view.code }}</strong> · {{ view.players.length }}/2</summary>
          <p class="ludi-eyebrow">Convite</p><input :value="invite" readonly aria-label="Endereço do convite" @focus="($event.target as HTMLInputElement).select()">
          <button class="ludi-secondary" @click="copyInvite">{{ copied ? 'Copiado' : 'Copiar convite' }}</button>
          <ul><li v-for="player in view.players" :key="player.id">{{ player.name }}</li></ul>
          <p class="ludi-small">A sala dura até oito horas. Mantém este browser para retomar a tua participação.</p>
        </details>
      </aside>
    </div>
    <footer class="ludi-controls">
      <p v-if="error" role="alert">{{ error }}</p>
      <button v-if="currentAction" class="ludi-primary" :disabled="busy || (currentAction.type === 'answer' && choice === null)" @click="act">{{ busy ? 'A guardar…' : currentAction.label }} <span aria-hidden="true">→</span></button>
      <p v-else role="status">{{ connection?.state === 'ended' ? 'Ligação terminada.' : view.phase === 'lobby' ? 'A aguardar para começar…' : 'A aguardar a outra pessoa…' }}</p>
    </footer>
  </main>
</template>
