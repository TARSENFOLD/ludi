<script setup lang="ts">
import type { LudiSession, LudiView, OwnQuestion, PreparationAction, SessionRelationship, SocialMode } from '@doot-games/games/ludi/contracts'
import { ludiActionId, type ConnectionState } from '../utils/ludi-session'
const props = defineProps<{ view: LudiView; session: LudiSession; connection?: ConnectionState }>()
const prep = computed(() => props.view.preparation!)
const control = computed(() => props.view.context.permissions.control)
const me = computed(() => prep.value.progress.find(p => p.playerId === props.view.context.participantId))
const busy = ref(false), error = ref(''), notice = ref('')
const selectedContext = ref<SessionRelationship | undefined>(prep.value.context)
const selectedMode = ref<SocialMode>(prep.value.config?.mode ?? 'entre-nos')
const editor = ref(false), editing = ref<OwnQuestion>(), editorKey = ref(0)
const heading = ref<HTMLElement>()
const controls = ref<HTMLElement>(), controlsHeight = ref(190)
let resizeControls: ResizeObserver | undefined
watch(controls, element => { resizeControls?.disconnect(); if (element) { resizeControls = new ResizeObserver(() => { controlsHeight.value = Math.ceil(element.getBoundingClientRect().height) }); resizeControls.observe(element) } })
onUnmounted(() => resizeControls?.disconnect())
const contexts: Array<[SessionRelationship, string]> = [['strangers','Acabámos de nos conhecer'],['friends','Amigos'],['couple','Casal / date'],['group','Grupo'],['close','Conhecemo-nos bem'],['random','Aleatório']]
const title = computed(() => ({ lobby: 'Quem se junta?', context: 'Quem está a jogar?', mode: 'Como querem jogar?', questions: prep.value.config?.mode === 'quem-me-conhece' ? 'Agora crias o jogo.' : 'Queres pôr uma pergunta tua no jogo?' })[prep.value.step])
watch(() => prep.value.step, async () => { editor.value = false; error.value = ''; notice.value = ''; await nextTick(); heading.value?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }) })
async function send(payload: Omit<PreparationAction, 'id' | 'revision'>) {
  if (busy.value || !props.session.prepare) return false
  busy.value = true; error.value = ''; notice.value = ''
  try { await props.session.prepare({ ...payload, id: ludiActionId(), revision: props.view.revision }); return true }
  catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível guardar. Tenta novamente.'; return false }
  finally { busy.value = false }
}
async function save(question: Omit<OwnQuestion, 'status'> & { status: 'draft' | 'submitted' }) {
  if (await send({ type: 'save-question', question })) { editor.value = false; editing.value = undefined; notice.value = question.status === 'draft' ? 'Rascunho guardado. Edita e guarda quando estiver pronto.' : 'Pergunta guardada.' }
}
function edit(q?: OwnQuestion) { editing.value = q; editorKey.value++; editor.value = true; error.value = '' }
async function start() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await props.session.send({ id: ludiActionId(), match: props.view.match, round: props.view.round, type: 'start' }) }
  catch(e) { error.value = e instanceof Error ? e.message : 'Não foi possível começar.' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="ludi-page ludi-game ludi-preparation" :style="{ '--l-controls-height': `${controlsHeight}px` }">
    <LudiHeader context="Entre Nós · Preparação" />
    <p v-if="connection?.message" class="ludi-notice" role="status">{{ connection.message }}</p>
    <div class="ludi-game-layout is-lobby">
      <section class="ludi-question">
        <p class="ludi-eyebrow">{{ prep.step === 'lobby' ? 'A vossa sala' : prep.step === 'context' ? 'Contexto' : prep.step === 'mode' ? 'Modo' : 'Perguntas só tuas' }}</p>
        <h1 ref="heading" tabindex="-1">{{ title }}</h1>
        <template v-if="prep.step === 'lobby'"><p class="ludi-lead">Cada pessoa entra no seu aparelho. Depois escolhem o contexto da conversa.</p><p class="ludi-small">Podem ser 2–6. O grupo mantém-se durante a partida; quem sair pode voltar pelo convite.</p></template>
        <template v-else-if="prep.step === 'context'">
          <p class="ludi-lead">{{ control ? 'Escolhe o contexto que melhor descreve vocês.' : 'Quem criou a sala está a escolher o contexto.' }}</p>
          <fieldset v-if="control" class="ludi-options" :disabled="busy"><legend class="sr-only">Contexto da sessão</legend><label v-for="[value, label] in contexts" :key="value" :class="{ selected: selectedContext === value }"><input v-model="selectedContext" type="radio" name="context" :value="value"><span>{{ label }}</span></label></fieldset>
        </template>
        <template v-else-if="prep.step === 'mode'">
          <p class="ludi-lead">{{ control ? 'Escolhe o tipo de sessão.' : 'Quem criou a sala está a escolher o modo.' }}</p>
          <fieldset v-if="control" class="ludi-options" :disabled="busy"><legend class="sr-only">Modo de jogo</legend>
            <label :class="{ selected: selectedMode === 'entre-nos' }"><input v-model="selectedMode" type="radio" name="mode" value="entre-nos"><span><strong>Entre Nós · Recomendado</strong><small>O jogo conduz. Vocês também podem pôr perguntas vossas.</small></span></label>
            <label :class="{ selected: selectedMode === 'quem-me-conhece' }"><input v-model="selectedMode" type="radio" name="mode" value="quem-me-conhece"><span><strong>Quem Me Conhece?</strong><small>Vocês criam o conteúdo. Nós damos o formato do jogo.</small></span></label>
          </fieldset>
        </template>
        <template v-else>
          <p class="ludi-small">{{ contexts.find(c => c[0] === prep.config?.context)?.[1] }} · {{ prep.config?.mode === 'quem-me-conhece' ? 'Quem Me Conhece?' : 'Entre Nós' }}</p>
          <p class="ludi-lead">{{ prep.config?.mode === 'quem-me-conhece' ? 'Prepara perguntas sobre ti. Os outros vão tentar acertar. Guarda pelo menos uma para começar.' : 'Cria uma pergunta para descobrir quem te conhece mesmo. Também podes saltar por agora.' }}</p>
          <p v-if="me?.ready" class="ludi-confirmed" role="status">Estás pronto. As tuas perguntas estão guardadas.</p>
          <LudiCustomQuestionEditor v-else-if="editor" :key="editorKey" :initial="editing" :busy="busy" :error="error" @save="save" @cancel="editor = false" />
          <template v-else>
            <ul v-if="prep.ownQuestions.length" class="ludi-own-questions"><li v-for="q in prep.ownQuestions" :key="q.id"><div><strong>{{ q.prompt }}</strong><small>{{ q.status === 'draft' ? 'Rascunho · ainda não entra na partida' : 'Guardada para a partida' }}</small></div><div class="ludi-inline-actions"><button class="ludi-text-button" :disabled="busy" @click="edit(q)">Editar</button><button class="ludi-text-button" :disabled="busy" @click="send({ type: 'delete-question', questionId: q.id })">Apagar</button></div></li></ul>
            <button v-if="prep.ownQuestions.length < prep.limit" class="ludi-secondary" :disabled="busy" @click="edit()">{{ prep.ownQuestions.length ? 'Criar outra pergunta' : 'Criar pergunta' }}</button>
          </template>
          <p v-if="notice" role="status" class="ludi-notice">{{ notice }}</p>
          <h2 class="ludi-prep-progress-title">Como vai o grupo</h2>
          <ul class="ludi-prep-progress" aria-label="Progresso da preparação"><li v-for="p in prep.progress" :key="p.playerId"><span>{{ view.players.find(v => v.id === p.playerId)?.name }}</span><strong>{{ p.ready ? 'Pronto' : `${p.count} ${p.count === 1 ? 'pergunta guardada' : 'perguntas guardadas'}` }}</strong></li></ul>
          <p class="ludi-small">Só vês as tuas perguntas. As dos outros aparecem durante a partida.</p>
        </template>
        <button v-if="control && prep.step !== 'lobby' && !editor" class="ludi-text-button" :disabled="busy" @click="send({ type: 'back' })">Voltar</button>
      </section>
      <LudiRoomInfo v-if="view.code" :code="view.code" :players="view.players" :me="view.context.participantId" :lobby="prep.step === 'lobby'" :max-players="6" />
    </div>
    <footer ref="controls" class="ludi-controls"><div class="ludi-controls-inner" :aria-busy="busy">
      <p v-if="error && !editor" class="ludi-error" role="alert">{{ error }}</p>
      <template v-if="control && prep.step === 'lobby'"><button class="ludi-primary" :disabled="busy || view.players.length < 2" @click="send({ type: 'advance' })">Continuar →</button><p v-if="view.players.length < 2" class="ludi-small">Falta pelo menos mais uma pessoa.</p></template>
      <button v-else-if="control && prep.step === 'context'" class="ludi-primary" :disabled="busy || !selectedContext" @click="send({ type: 'context', context: selectedContext })">Continuar →</button>
      <button v-else-if="control && prep.step === 'mode'" class="ludi-primary" :disabled="busy" @click="send({ type: 'mode', mode: selectedMode })">Continuar →</button>
      <template v-else-if="prep.step === 'questions' && !editor">
        <button v-if="!me?.ready" class="ludi-primary" :disabled="busy || (prep.config?.mode === 'quem-me-conhece' && !me?.count)" @click="send({ type: 'readiness', ready: true })">{{ prep.config?.mode === 'entre-nos' && !me?.count ? 'Saltar por agora · estou pronto' : 'Estou pronto' }}</button>
        <template v-else><button v-if="view.actions.some(a => a.type === 'start')" class="ludi-primary" :disabled="busy" @click="start">Começar a conversa →</button><p v-else class="ludi-waiting" role="status">{{ control ? 'A aguardar que o grupo fique pronto.' : 'Estás pronto. Quem criou a sala começa quando todos terminarem.' }}</p><button class="ludi-text-button" :disabled="busy" @click="send({ type: 'readiness', ready: false })">Voltar às minhas perguntas</button></template>
      </template>
      <p v-else class="ludi-waiting" role="status">{{ editor ? 'Guarda a pergunta no formulário para continuar.' : 'À espera de quem criou a sala.' }}</p>
    </div></footer>
  </main>
</template>
