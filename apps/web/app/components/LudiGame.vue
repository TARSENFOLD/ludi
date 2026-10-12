<script setup lang="ts">
import type { LudiSession, LudiView } from "@doot-games/games/ludi/contracts";
import { ludiActionId, type ConnectionState } from '../utils/ludi-session'
import { getLudiManifest } from '@doot-games/games/ludi'
const props = defineProps<{ session: LudiSession; connection?: ConnectionState }>()
const view = shallowRef<LudiView>()
const choice = ref<number | null>(null)
const value = ref(50)
const social = computed(() => !!view.value?.preparation || !!view.value?.content && 'social' in view.value.content && view.value.content.social || !!view.value?.summary)
const onda = computed(() => view.value?.gameId === 'na-mesma-onda')
const spec = computed(() => view.value ? getLudiManifest(view.value.gameId).modes.find(m => m.mode === view.value?.context.mode) : undefined)
const createPath = computed(() => onda.value ? '/ludi/na-mesma-onda' : '/duo')
const answered = computed(() => view.value?.ownChoice !== undefined || view.value?.ownValue !== undefined || view.value?.skipped)
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
    if (!old || next.match !== old.match || next.round !== old.round || next.stage !== old.stage || next.context.participantId !== old.context.participantId) { choice.value = null; value.value = 50 }
    view.value = next
  })
}, { immediate: true })
watch(controls, (element) => {
  resizeControls?.disconnect()
  if (element) {
    resizeControls = new ResizeObserver(() => { controlsHeight.value = Math.ceil(element.getBoundingClientRect().height) })
    resizeControls.observe(element)
  }
})
onUnmounted(() => { unsubscribe?.(); resizeControls?.disconnect(); props.session.disconnect() })
const connectionMessage = computed(() => props.connection?.state === 'reconnecting' && !answered.value ? 'A restabelecer a ligação. Mantém esta página aberta.' : props.connection?.message)
const currentAction = computed(() => props.connection?.state === 'ended' ? undefined : view.value?.actions[0])
const me = computed(() => view.value?.players.find((p) => p.id === view.value?.context.participantId))
const socialRounds = computed(() => view.value?.history?.filter(round => round.reveal.counts) ?? [])
const inTune = computed(() => socialRounds.value.filter(round => round.reveal.counts?.filter(n => n > 0).length === 1).length)
const announcement = computed(() => {
  const v = view.value
  if (!v) return ''
  if (props.connection?.state === 'ended') return 'Esta sala terminou.'
  if (v.phase === 'results') return v.summary ? 'Conversa concluída. Resumo disponível.' : 'Partida concluída. Pontuação disponível.'
  if (v.reveal) return 'Resultado revelado.'
  if (v.roundState === 'locked') return 'Todos responderam.'
  if (v.ownChoice !== undefined || v.ownValue !== undefined) return 'Resposta confirmada.'
  return ''
})
const stageKey = computed(() => view.value ? `${props.connection?.state === 'ended' ? 'ended' : 'live'}-${view.value.match}-${view.value.round}-${view.value.stage ?? ''}-${view.value.phase}-${view.value.handoff?.name ?? ''}` : '')
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
  if (v.phase === 'lobby') return v.players.length < 2 ? 'Envia o convite. Precisam de pelo menos duas pessoas.' : 'O grupo está pronto. Quem criou a sala pode começar.'
  if (v.phase === 'results') return 'Partida concluída. Quem criou a sala pode iniciar outra.'
  if (v.roundState === 'reveal') return 'Resultado revelado. Quem criou a sala avança.'
  if (v.roundState === 'locked') return 'Todos responderam. Quem criou a sala pode revelar.'
  if (v.content?.kind === 'conversation') return 'Conversem com calma. Podem passar sem explicar.'
  if (v.stage === 'prediction') return 'A aguardar as previsões do grupo.'
  if (v.stage === 'target-answer') return 'Agora responde a pessoa sobre quem fizeram a previsão.'
  if (v.skipped) return 'Passaste esta pergunta. Sem precisar de explicar.'
  if (social.value && !answered.value) return 'Esta pergunta é sobre ti. O resto do grupo está a responder.'
  return 'A tua resposta está guardada. A aguardar o resto do grupo.'
})
const momentLabel = computed(() => {
  const c = view.value?.content
  const type = c && 'momentType' in c ? c.momentType : undefined
  return ({ 'quick-choice': 'Escolha rápida', sync: 'Em sintonia?', story: 'Uma história', perception: 'Entre vocês', custom: 'Quem me conhece?', prediction: 'Será que me conheces?', 'who-here': 'Quem aqui…?' } as Record<string, string>)[type ?? '']
})
const actionHint = computed(() => {
  if (currentAction.value?.type === 'answer' && onda.value) return 'Escolhe uma posição e confirma.'
  if (currentAction.value?.type === 'answer') return choice.value === null ? 'Escolhe uma resposta para continuar.' : 'Escolha feita. Falta confirmar.'
  return ''
})
const busyLabel = computed(() => ({ start: 'A começar…', answer: 'A confirmar…', reveal: 'A revelar…', next: 'A avançar…', finish: 'A terminar…', replay: 'A preparar…', ready: 'A preparar…', skip: 'A passar…', continue: 'A preparar…' })[currentAction.value?.type ?? 'answer'])
async function act(type?: LudiView['actions'][number]['type']) {
  const action = type ? view.value?.actions.find(a => a.type === type) : currentAction.value
  const v = view.value
  if (!action || !v || busy.value) return
  busy.value = true; error.value = ''
  try {
    await props.session.send({ id: ludiActionId(), match: v.match, round: v.round, type: action.type, ...(action.type === 'answer' ? (onda.value ? { value: value.value } : choice.value !== null ? { choice: choice.value, ...(action.stage ? { stage: action.stage } : {}) } : {}) : {}) })
  } catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível continuar.' }
  finally { busy.value = false }
}
async function configureAgain() {
  if (!view.value || !props.session.prepare || busy.value) return
  busy.value = true; error.value = ''
  try { await props.session.prepare({ id: ludiActionId(), revision: view.value.revision, type: 'configure-again' }) }
  catch(e) { error.value = e instanceof Error ? e.message : 'Não foi possível mudar o contexto.' }
  finally { busy.value = false }
}
</script>

<template>
  <LudiTicTacToe v-if="view?.ticTacToe" :view="view" :session="session" :connection="connection" />
  <LudiPreparation v-else-if="view?.preparation && connection?.state !== 'ended'" :view="view" :session="session" :connection="connection" />
  <LudiSocialGame v-else-if="view && social" :view="view" :session="session" :connection="connection" />
  <main v-else-if="view" class="ludi-page ludi-game" :style="{ '--l-controls-height': `${controlsHeight}px` }">
    <LudiHeader :context="me ? `${view.title} · ${me.name}` : view.title" />
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    <p v-if="connectionMessage && connection?.state !== 'ended'" role="status" class="ludi-notice">{{ connectionMessage }}</p>
    <div class="ludi-game-layout" :class="{ 'is-lobby': view.phase === 'lobby' && view.code && connection?.state !== 'ended' }">
      <section :key="stageKey" class="ludi-question ludi-stage-enter" :class="{ 'is-answering': currentAction?.type === 'answer', 'is-revealing': view.phase === 'active' && !!view.reveal && connection?.state !== 'ended', 'is-handoff': !!view.handoff }">
        <LudiProgress v-if="view.phase === 'active' && connection?.state !== 'ended'" :round="view.round" :total="view.totalRounds" />
        <template v-if="connection?.state === 'ended'">
          <p class="ludi-eyebrow">Ligação terminada</p>
          <h1 ref="heading" tabindex="-1">Esta ligação terminou.</h1>
          <p class="ludi-lead">{{ connectionMessage }}</p>
        </template>
        <template v-else-if="view.phase === 'lobby'">
          <LudiGameMark :game="view.gameId" />
          <p class="ludi-eyebrow">{{ view.title }}</p>
          <h1 ref="heading" tabindex="-1">{{ view.context.mode === 'room' ? (view.players.length >= 2 ? (onda ? 'O grupo está pronto.' : 'A dupla está pronta.') : 'Quem se junta?') : 'Prontos para o desafio?' }}</h1>
          <p v-if="view.context.mode !== 'room'" class="ludi-lead">Cinco perguntas. Um ponto por acerto, sem temporizador.</p>
          <p v-else-if="view.players.length < 2" class="ludi-lead">Envia o convite. Cada pessoa joga no seu aparelho.</p>
          <p v-else class="ludi-lead">{{ view.context.permissions.control ? (view.players.length < (view.capacity?.max ?? spec?.players.max ?? 2) ? 'Já podem começar. Ou convidar mais alguém, até ao limite da sala.' : 'Já estão todos aqui. Podes começar!') : 'Quem criou a sala pode começar.' }}</p>
          <p v-if="onda" class="ludi-small">Seis temas, sem temporizador. Todos escolhem uma posição; quem criou a sala revela e avança. Na revanche, o grupo mantém-se.</p>
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
            <p class="ludi-eyebrow">{{ momentLabel ?? (view.content.kind === 'spectrum' ? 'A tua posição' : view.content.kind === 'poll' ? 'A tua escolha' : 'Desafio') }}</p>
            <p v-if="'targetName' in view.content && view.content.targetName" class="ludi-small">Sobre <strong>{{ view.content.targetName }}</strong></p>
            <h1 ref="heading" tabindex="-1">{{ view.content.prompt }}</h1>
            <p v-if="view.stage" class="ludi-small">{{ view.stage === 'prediction' ? 'Prevê a escolha desta pessoa. Ela responde a seguir, sem ver as previsões.' : 'As previsões estão guardadas. Agora a pessoa escolhe por si.' }}</p>
            <p v-if="currentAction?.type === 'answer'" class="ludi-small ludi-prompt-note">{{ view.content.kind !== 'guess' ? 'Não há resposta certa. Vai pela tua.' : 'Sem pressa. Escolhe e confirma.' }}</p>
          </div>
          <div v-if="view.content.kind === 'conversation'" class="ludi-conversation"><p class="ludi-lead">Uma conversa, sem escrever respostas.</p><p>Quem quiser pode contar. Passar é sempre uma opção, sem explicar.</p><p class="ludi-small">O jogo não grava esta conversa.</p></div>
          <LudiSpectrum v-else-if="view.content.kind === 'spectrum' && (currentAction?.type === 'answer' || view.reveal)" v-model:value="value" :content="view.content" :own-value="view.ownValue" :reveal="view.reveal" :disabled="busy" />
          <fieldset v-else-if="'options' in view.content && currentAction?.type === 'answer'" class="ludi-options" :disabled="busy">
            <legend class="sr-only">Escolhe uma resposta</legend>
            <label v-for="(option, index) in view.content.options" :key="index" :class="{ selected: choice === index }">
              <input v-model="choice" type="radio" name="answer" :value="index">
              <span class="ludi-option-letter" aria-hidden="true">{{ String.fromCharCode(65 + index) }}</span>
              <span class="ludi-option-text">{{ option }}</span>
              <span class="ludi-option-check" aria-hidden="true">{{ choice === index ? '✓' : '' }}</span>
            </label>
          </fieldset>
          <LudiReveal v-else-if="'options' in view.content && view.reveal" :content="view.content" :reveal="view.reveal" :own-choice="view.ownChoice" :mode="view.context.mode" />
          <div v-else class="ludi-confirmed">
            <span class="ludi-confirmed-check" aria-hidden="true">{{ answered ? '✓' : '…' }}</span>
            <div><h2>{{ view.skipped ? 'Passaste esta pergunta.' : view.roundState === 'locked' ? 'O grupo está pronto!' : answered ? 'Resposta confirmada.' : 'É a vez do resto do grupo.' }}</h2>
              <p v-if="'options' in view.content && view.ownChoice !== undefined">A tua escolha: <strong>{{ view.content.options[view.ownChoice] }}</strong></p>
              <p v-if="view.ownValue !== undefined">A tua posição: <strong>{{ view.ownValue }} de 100</strong></p>
              <p v-if="view.roundState === 'locked' && view.context.permissions.control" class="ludi-small">Vamos descobrir o resultado?</p>
              <p v-else class="ludi-small">{{ answered ? 'A tua resposta fica guardada, mesmo que precises de voltar.' : 'A revelação chega quando o grupo terminar.' }}</p>
            </div>
          </div>
        </template>
        <template v-else-if="view.phase === 'results'">
          <div class="ludi-result-mark" aria-hidden="true">✳</div>
          <p class="ludi-eyebrow">{{ view.totalRounds }} rondas · partida concluída</p>
          <h1 ref="heading" tabindex="-1">Valeu a pausa.</h1>
          <p class="ludi-lead">{{ onda ? 'Seis temas depois, há sempre uma nova perspetiva.' : view.gameId === 'entre-nos' ? 'O que descobriram merece continuar fora do jogo.' : 'Cinco perguntas depois, há sempre espaço para mais uma.' }}</p>
          <p v-if="!view.summary && socialRounds.length" class="ludi-social-summary"><strong>{{ inTune }} de {{ socialRounds.length }}</strong> escolhas em sintonia.</p>
        </template>
        <section v-if="view.summary" class="ludi-social-results" aria-label="Retrato da sessão">
          <h2>O que fica entre vocês</h2>
          <dl><div v-if="view.summary.inTune + view.summary.divided > 0"><dt>Momentos em sintonia</dt><dd>{{ view.summary.inTune }}</dd></div><div v-if="view.summary.inTune + view.summary.divided > 0"><dt>Escolhas que deram conversa</dt><dd>{{ view.summary.divided }}</dd></div><div v-if="view.summary.predictions"><dt>Previsões acertadas</dt><dd>{{ view.summary.correctPredictions }} de {{ view.summary.predictions }}</dd></div><div v-if="view.summary.customUsed"><dt>Perguntas vossas nesta partida</dt><dd>{{ view.summary.customUsed }}</dd></div><div v-if="view.summary.customAttempts"><dt>Palpites que acertaram nas perguntas vossas</dt><dd>{{ view.summary.customMatches }} de {{ view.summary.customAttempts }}</dd></div></dl>
          <p v-if="view.summary.customRemaining">Ainda há {{ view.summary.customRemaining }} perguntas vossas por descobrir.</p>
          <p class="ludi-small">Sem vencedor. Levem uma história, uma descoberta ou um próximo convite.</p>
          <button v-if="view.context.permissions.control" class="ludi-text-button" :disabled="busy" @click="configureAgain">Mudar contexto ou modo</button>
        </section>
        <section v-if="onda && view.players.length === 2 && view.scores && connection?.state !== 'ended'" class="ludi-scoreboard" aria-label="Sintonia da dupla">
          <h2>Sintonia da dupla</h2>
          <p v-if="view.reveal?.duoScore !== undefined"><strong>{{ view.reveal.duoScore }}</strong> de 1000 pontos nesta ronda.</p>
          <p><strong>{{ view.scores[0]?.score ?? 0 }}</strong> de {{ view.phase === 'results' ? 6000 : (view.round + 1) * 1000 }} pontos acumulados.</p>
          <p class="ludi-small">{{ view.phase === 'results' ? 'A pontuação é dos dois. Outra partida, novas perspetivas.' : 'Depois da revelação, a média e a tua posição permitem descobrir a posição da outra pessoa.' }}</p>
        </section>
        <p v-if="onda && view.phase === 'results'" class="ludi-small">Repetir mantém este grupo e as mesmas identidades. Para continuar sem alguém, criem outra sala.</p>
        <LudiScores v-if="connection?.state !== 'ended' && !(onda && view.players.length === 2) && view.scores && (view.content?.kind !== 'poll' || view.phase === 'results')" :scores="view.scores" :me="view.context.mode === 'same-device' ? undefined : view.context.participantId" :final="view.phase === 'results'" />
        <details v-if="view.history && connection?.state !== 'ended'" class="ludi-history"><summary>Rever as rondas</summary>
          <section v-for="(round, i) in view.history" :key="i"><p class="ludi-eyebrow">Ronda {{ i + 1 }}</p><h2>{{ round.prompt }}</h2>
            <template v-if="round.reveal.marks"><p>{{ round.leftLabel }} ↔ {{ round.rightLabel }}</p><p>Média: {{ round.reveal.mean?.toLocaleString('pt-PT', { maximumFractionDigits: 1 }) }} · Posições: {{ round.reveal.marks.join(' · ') }}</p></template>
            <p v-if="round.reveal.targetSkipped">A pessoa preferiu passar.</p><p v-if="round.reveal.correctLabel">{{ round.reveal.correctLabel }}</p>
            <p v-for="(n, j) in round.reveal.counts" :key="j">{{ round.options?.[j] }} · {{ n }}</p>
          </section>
        </details>
        <NuxtLink v-if="view.phase === 'results' && connection?.state !== 'ended'" class="ludi-text-button ludi-other-games" to="/ludi">Escolher outro jogo</NuxtLink>
      </section>
      <LudiRoomInfo v-if="view.code && connection?.state !== 'ended'" :code="view.code" :players="view.players" :me="view.context.participantId" :lobby="view.phase === 'lobby'" :max-players="view.capacity?.max ?? spec?.players.max" />
    </div>
    <footer ref="controls" class="ludi-controls" :aria-busy="busy">
      <div class="ludi-controls-inner">
        <p v-if="error" class="ludi-error" role="alert">{{ error }}</p>
        <p v-if="actionHint" class="ludi-control-hint" role="status">{{ actionHint }}</p>
        <button v-if="currentAction" class="ludi-primary" :disabled="busy || (currentAction.type === 'answer' && !onda && choice === null)" @click="act()">{{ busy ? busyLabel : currentAction.label }} <span aria-hidden="true">→</span></button>
        <NuxtLink v-else-if="connection?.state === 'ended'" class="ludi-primary" :to="createPath">Criar outra sala <span aria-hidden="true">→</span></NuxtLink>
        <p v-else class="ludi-waiting" role="status"><span class="ludi-status-dot" aria-hidden="true" />{{ waitingMessage }}</p>
        <div v-if="connection?.state !== 'ended' && view.actions.length > 1" class="ludi-inline-actions"><button v-for="action in view.actions.slice(1)" :key="action.type" class="ludi-text-button" :disabled="busy" @click="act(action.type)">{{ action.label }}</button></div>
      </div>
    </footer>
  </main>
</template>
