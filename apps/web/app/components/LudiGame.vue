<script setup lang="ts">
import type { LudiSession, LudiView } from '@doot-games/sdk/ludi'
import { ludiActionId, type ConnectionState } from '../utils/ludi-session'
const props = defineProps<{ session: LudiSession; connection?: ConnectionState }>()
const view = shallowRef<LudiView>()
const choice = ref<number | null>(null)
const busy = ref(false)
const error = ref('')
const heading = ref<HTMLElement>()
const controls = ref<HTMLElement>()
const controlsHeight = ref(112)
let unsubscribe: (() => void) | undefined
let resizeControls: ResizeObserver | undefined
watch(() => props.session, (session) => {
  unsubscribe?.()
  unsubscribe = session.observe((next) => {
    const old = view.value
    if (!old || next.match !== old.match || next.round !== old.round || next.context.participantId !== old.context.participantId) choice.value = null
    view.value = next
  })
}, { immediate: true })
onMounted(() => {
  if (controls.value) {
    resizeControls = new ResizeObserver(([entry]) => { if (entry) controlsHeight.value = Math.ceil(entry.target.getBoundingClientRect().height) })
    resizeControls.observe(controls.value)
  }
})
onUnmounted(() => { unsubscribe?.(); resizeControls?.disconnect(); props.session.disconnect() })
const connectionMessage = computed(() => props.connection?.state === 'reconnecting' && view.value?.ownChoice === undefined ? 'A restabelecer a ligação. Mantém esta página aberta.' : props.connection?.message)
const currentAction = computed(() => props.connection?.state === 'ended' ? undefined : view.value?.actions[0])
const me = computed(() => view.value?.players.find((p) => p.id === view.value?.context.participantId))
const socialRounds = computed(() => view.value?.history?.filter(round => round.reveal.counts) ?? [])
const inTune = computed(() => socialRounds.value.filter(round => round.reveal.counts?.filter(n => n > 0).length === 1).length)
const announcement = computed(() => {
  const v = view.value
  if (!v) return ''
  if (props.connection?.state === 'ended') return 'Esta sala terminou.'
  if (v.phase === 'results') return 'Partida concluída. Pontuação disponível.'
  if (v.reveal) return 'Resultado revelado.'
  if (v.roundState === 'locked') return 'Todos responderam.'
  if (v.ownChoice !== undefined) return 'Resposta confirmada.'
  return ''
})
const stageKey = computed(() => view.value ? `${props.connection?.state === 'ended' ? 'ended' : 'live'}-${view.value.match}-${view.value.round}-${view.value.phase}-${view.value.handoff?.name ?? ''}` : '')
watch(stageKey, async (_, previous) => {
  if (!previous) return
  await nextTick()
  heading.value?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
})
const waitingMessage = computed(() => {
  const v = view.value
  if (!v) return ''
  if (props.connection?.state === 'ended') return 'Esta ligação terminou.'
  if (v.phase === 'lobby') return v.players.length < 2 ? 'Envia o convite. A outra pessoa entra pelo link.' : 'Já estão os dois. Quem criou a sala pode começar.'
  if (v.phase === 'results') return 'Partida concluída. Quem criou a sala pode iniciar outra.'
  if (v.roundState === 'reveal') return 'Resultado revelado. Quem criou a sala avança.'
  if (v.roundState === 'locked') return 'Todos responderam. Quem criou a sala pode revelar.'
  return 'A tua resposta está guardada. Falta a outra pessoa.'
})
const actionHint = computed(() => {
  if (currentAction.value?.type === 'answer') return choice.value === null ? 'Escolhe uma resposta para continuar.' : 'Escolha feita. Falta confirmar.'
  return ''
})
const busyLabel = computed(() => ({ start: 'A começar…', answer: 'A confirmar…', reveal: 'A revelar…', next: 'A avançar…', finish: 'A terminar…', replay: 'A preparar…', ready: 'A preparar…' })[currentAction.value?.type ?? 'answer'])
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
</script>

<template>
  <main v-if="view" class="ludi-page ludi-game" :style="{ '--l-controls-height': `${controlsHeight}px` }">
    <LudiHeader :context="me ? `${view.title} · ${me.name}` : view.title" />
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    <p v-if="connectionMessage && connection?.state !== 'ended'" role="status" class="ludi-notice">{{ connectionMessage }}</p>
    <div class="ludi-game-layout" :class="{ 'is-lobby': view.phase === 'lobby' && view.code && connection?.state !== 'ended' }">
      <section :key="stageKey" class="ludi-question ludi-stage-enter" :class="{ 'is-answering': currentAction?.type === 'answer', 'is-handoff': !!view.handoff }">
        <LudiProgress v-if="view.phase === 'active' && connection?.state !== 'ended'" :round="view.round" :total="view.totalRounds" />
        <template v-if="connection?.state === 'ended'">
          <p class="ludi-eyebrow">Ligação terminada</p>
          <h1 ref="heading" tabindex="-1">Esta ligação terminou.</h1>
          <p class="ludi-lead">{{ connectionMessage }}</p>
        </template>
        <template v-else-if="view.phase === 'lobby'">
          <LudiGameMark :game="view.gameId" />
          <p class="ludi-eyebrow">{{ view.title }}</p>
          <h1 ref="heading" tabindex="-1">{{ view.context.mode === 'room' ? (view.players.length === 2 ? 'A dupla está pronta.' : 'Falta a outra metade.') : 'Prontos para o desafio?' }}</h1>
          <p v-if="view.context.mode !== 'room'" class="ludi-lead">Cinco perguntas. Um ponto por acerto, sem temporizador.</p>
          <p v-else-if="view.players.length < 2" class="ludi-lead">Um convite, dois aparelhos. A conversa começa já.</p>
          <p v-else class="ludi-lead">{{ view.context.permissions.control ? 'Já estão os dois aqui. Podes começar!' : 'Já estão os dois aqui. Quem criou a sala pode começar.' }}</p>
          <LudiRoster v-if="!view.code" :players="view.players" :me="view.context.mode === 'solo' ? view.context.participantId : undefined" />
        </template>
        <template v-else-if="view.handoff">
          <p class="ludi-eyebrow">Passar o aparelho</p>
          <span class="ludi-handoff-mark" aria-hidden="true">↗</span>
          <h1 ref="heading" tabindex="-1">É a vez de<br>{{ view.handoff.name }}.</h1>
          <p class="ludi-lead">Entrega o aparelho. A próxima resposta fica entre a pessoa e o ecrã.</p>
          <p class="ludi-small">Toca em «Estou pronto/a» quando o aparelho estiver contigo.</p>
        </template>
        <template v-else-if="view.phase === 'active' && view.content">
          <div class="ludi-prompt">
            <p class="ludi-eyebrow">{{ view.content.kind === 'poll' ? 'A tua escolha' : 'Desafio' }}</p>
            <h1 ref="heading" tabindex="-1">{{ view.content.prompt }}</h1>
            <p v-if="currentAction?.type === 'answer'" class="ludi-small ludi-prompt-note">{{ view.content.kind === 'poll' ? 'Não há resposta certa. Vai pela tua.' : 'Sem pressa. Escolhe e confirma.' }}</p>
          </div>
          <fieldset v-if="currentAction?.type === 'answer'" class="ludi-options" :disabled="busy">
            <legend class="sr-only">Escolhe uma resposta</legend>
            <label v-for="(option, index) in view.content.options" :key="index" :class="{ selected: choice === index }">
              <input v-model="choice" type="radio" name="answer" :value="index">
              <span class="ludi-option-letter" aria-hidden="true">{{ String.fromCharCode(65 + index) }}</span>
              <span class="ludi-option-text">{{ option }}</span>
              <span class="ludi-option-check" aria-hidden="true">{{ choice === index ? '✓' : '' }}</span>
            </label>
          </fieldset>
          <LudiReveal v-else-if="view.reveal" :content="view.content" :reveal="view.reveal" :own-choice="view.ownChoice" :mode="view.context.mode" />
          <div v-else class="ludi-confirmed">
            <span class="ludi-confirmed-check" aria-hidden="true">✓</span>
            <div><h2>{{ view.roundState === 'locked' ? 'Todos responderam!' : 'Resposta confirmada.' }}</h2>
              <p v-if="view.ownChoice !== undefined">A tua escolha: <strong>{{ view.content.options[view.ownChoice] }}</strong></p>
              <p v-if="view.roundState === 'locked' && view.context.permissions.control" class="ludi-small">Vamos descobrir o resultado?</p>
              <p v-else class="ludi-small">A tua resposta fica guardada, mesmo que precises de voltar.</p>
            </div>
          </div>
        </template>
        <template v-else-if="view.phase === 'results'">
          <div class="ludi-result-mark" aria-hidden="true">✳</div>
          <p class="ludi-eyebrow">{{ view.totalRounds }} rondas · partida concluída</p>
          <h1 ref="heading" tabindex="-1">Valeu a pausa.</h1>
          <p class="ludi-lead">{{ view.gameId === 'entre-nos' ? 'As escolhas dão conversa. Os desafios dão pontos.' : 'Cinco perguntas depois, há sempre espaço para mais uma.' }}</p>
          <p v-if="socialRounds.length" class="ludi-social-summary"><strong>{{ inTune }} de {{ socialRounds.length }}</strong> escolhas em sintonia.</p>
        </template>
        <LudiScores v-if="connection?.state !== 'ended' && view.scores && (view.content?.kind !== 'poll' || view.phase === 'results')" :scores="view.scores" :me="view.context.mode === 'same-device' ? undefined : view.context.participantId" :final="view.phase === 'results'" />
        <details v-if="view.history && connection?.state !== 'ended'" class="ludi-history"><summary>Rever as rondas</summary>
          <section v-for="(round, i) in view.history" :key="i"><p class="ludi-eyebrow">Ronda {{ i + 1 }}</p><h2>{{ round.prompt }}</h2>
            <p v-if="round.reveal.correctLabel">{{ round.reveal.correctLabel }}</p>
            <p v-for="(n, j) in round.reveal.counts" :key="j">{{ round.options[j] }} · {{ n }}</p>
          </section>
        </details>
        <NuxtLink v-if="view.phase === 'results' && connection?.state !== 'ended'" class="ludi-text-button ludi-other-games" to="/ludi">Escolher outro jogo</NuxtLink>
      </section>
      <LudiRoomInfo v-if="view.code && connection?.state !== 'ended'" :code="view.code" :players="view.players" :me="view.context.participantId" :lobby="view.phase === 'lobby'" />
    </div>
    <footer ref="controls" class="ludi-controls" :aria-busy="busy">
      <div class="ludi-controls-inner">
        <p v-if="error" class="ludi-error" role="alert">{{ error }}</p>
        <p v-if="actionHint" class="ludi-control-hint" role="status">{{ actionHint }}</p>
        <button v-if="currentAction" class="ludi-primary" :disabled="busy || (currentAction.type === 'answer' && choice === null)" @click="act">{{ busy ? busyLabel : currentAction.label }} <span aria-hidden="true">→</span></button>
        <NuxtLink v-else-if="connection?.state === 'ended'" class="ludi-primary" to="/duo">Criar outra sala <span aria-hidden="true">→</span></NuxtLink>
        <p v-else class="ludi-waiting" role="status"><span class="ludi-status-dot" aria-hidden="true" />{{ waitingMessage }}</p>
      </div>
    </footer>
  </main>
</template>
