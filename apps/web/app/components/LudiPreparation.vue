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
const contexts: Array<[SessionRelationship, string, string]> = [
  ['strangers', 'Primeiro encontro', 'Ainda se estão a conhecer.'],
  ['friends', 'Amigos', 'Amizades e descobertas do dia a dia.'],
  ['couple', 'Casal / date', 'Uma partida com alguém especial.'],
  ['group', 'Grupo misto', 'Colegas, turma ou pessoas de vários círculos.'],
  ['close', 'Muito próximos', 'Já têm confiança e histórias em comum.'],
  ['random', 'Surpreende-nos', 'Uma mistura, sem escolher um contexto.'],
]
const modes: Array<{ id: SocialMode; title: string; source: string; description: string; preparation: string; glyph: number }> = [
  { id: 'entre-nos', title: 'Entre Nós', source: 'Perguntas prontas', description: 'O Ludi traz as perguntas. Vocês escolhem respostas, fazem previsões e partilham histórias.', preparation: 'Nada obrigatório para preparar. Podem acrescentar perguntas vossas.', glyph: 2 },
  { id: 'quem-me-conhece', title: 'Quem Me Conhece?', source: 'Perguntas criadas por vocês', description: 'Cada pessoa cria perguntas sobre si e indica a resposta certa. Os outros tentam adivinhar.', preparation: 'Antes de jogar, cada pessoa guarda pelo menos uma pergunta.', glyph: 0 },
]
const title = computed(() => ({ lobby: 'Quem se junta?', context: 'Quem está a jogar?', mode: 'De onde vêm as perguntas?', questions: prep.value.config?.mode === 'quem-me-conhece' ? 'Agora crias o jogo.' : 'Queres pôr uma pergunta tua no jogo?' })[prep.value.step])
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
    <LudiSocialHeader :view="view" />
    <p v-if="connection?.message" class="ludi-notice" role="status">{{ connection.message }}</p>
    <div class="ludi-game-layout is-lobby" :class="{ 'is-choosing': prep.step === 'mode' || prep.step === 'context' }">
      <section class="ludi-question">
        <p class="ludi-eyebrow">{{ prep.step === 'lobby' ? 'A vossa sala' : prep.step === 'context' ? 'Contexto' : prep.step === 'mode' ? 'Modo' : 'Perguntas só tuas' }}</p>
        <h1 ref="heading" tabindex="-1">{{ title }}</h1>
        <template v-if="prep.step === 'lobby'"><p class="ludi-lead">Cada pessoa entra no seu aparelho. Depois escolhem os temas e como querem jogar.</p><p class="ludi-small">Podem ser 2–6. O grupo mantém-se durante a partida; quem sair pode voltar pelo convite.</p></template>
        <template v-else-if="prep.step === 'context'">
          <p class="ludi-lead">{{ control ? 'Quem está nesta sala? A escolha ajuda o Ludi a selecionar os temas.' : 'Quem criou a sala está a escolher o contexto.' }}</p>
          <fieldset v-if="control" class="ludi-options social-context-options" :disabled="busy">
            <legend class="sr-only">Contexto da sessão</legend>
            <label v-for="[value, label, description] in contexts" :key="value" :class="{ selected: selectedContext === value }">
              <input v-model="selectedContext" type="radio" name="context" :value="value">
              <LudiSocialGlyph :label="value === 'strangers' || value === 'close' ? 'pessoas' : label" />
              <span class="social-context-copy"><strong>{{ label }}</strong><small>{{ description }}</small></span>
              <span class="social-context-check" aria-hidden="true">{{ selectedContext === value ? '✓' : '' }}</span>
            </label>
          </fieldset>
        </template>
        <template v-else-if="prep.step === 'mode'">
          <p class="ludi-lead">{{ control ? 'Escolhe uma das duas formas de jogar. Todo o grupo joga a mesma.' : 'Quem criou a sala escolhe uma destas formas de jogar para todo o grupo.' }}</p>
          <fieldset v-if="control" class="ludi-options social-mode-options" :disabled="busy">
            <legend class="sr-only">Tipo de sessão e preparação necessária</legend>
            <label v-for="mode in modes" :key="mode.id" :class="{ selected: selectedMode === mode.id }">
              <input v-model="selectedMode" type="radio" name="mode" :value="mode.id">
              <span class="social-mode-top"><LudiSocialGlyph :variant="mode.glyph" /><span class="social-mode-source">{{ mode.source }}</span><span class="social-mode-check" aria-hidden="true">{{ selectedMode === mode.id ? '✓' : '' }}</span></span>
              <strong class="social-mode-title">{{ mode.title }}</strong>
              <span class="social-mode-description">{{ mode.description }}</span>
              <span class="social-mode-preparation">{{ mode.preparation }}</span>
              <span v-if="mode.id === 'entre-nos'" class="social-mode-recommended">Ideal para a primeira partida</span>
            </label>
          </fieldset>
          <div v-else class="social-mode-explainer">
            <section v-for="mode in modes" :key="mode.id"><h2>{{ mode.title }}</h2><p>{{ mode.description }}</p><p class="ludi-small">{{ mode.preparation }}</p></section>
          </div>
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
      <button v-else-if="control && prep.step === 'context'" class="ludi-primary" :disabled="busy || !selectedContext" @click="send({ type: 'context', context: selectedContext })">Escolher como jogar →</button>
      <button v-else-if="control && prep.step === 'mode'" class="ludi-primary" :disabled="busy" @click="send({ type: 'mode', mode: selectedMode })">{{ selectedMode === 'entre-nos' ? 'Continuar com Entre Nós →' : 'Preparar as nossas perguntas →' }}</button>
      <template v-else-if="prep.step === 'questions' && !editor">
        <button v-if="!me?.ready" class="ludi-primary" :disabled="busy || (prep.config?.mode === 'quem-me-conhece' && !me?.count)" @click="send({ type: 'readiness', ready: true })">{{ prep.config?.mode === 'entre-nos' && !me?.count ? 'Saltar por agora · estou pronto' : 'Estou pronto' }}</button>
        <template v-else><button v-if="view.actions.some(a => a.type === 'start')" class="ludi-primary" :disabled="busy" @click="start">Começar a jogar →</button><p v-else class="ludi-waiting" role="status">A aguardar que o grupo fique pronto. Depois, qualquer pessoa pode começar.</p><button class="ludi-text-button" :disabled="busy" @click="send({ type: 'readiness', ready: false })">Voltar às minhas perguntas</button></template>
      </template>
      <p v-else class="ludi-waiting" role="status">{{ editor ? 'Guarda a pergunta no formulário para continuar.' : 'À espera de quem criou a sala.' }}</p>
    </div></footer>
  </main>
</template>

<style scoped>
.ludi-preparation .ludi-game-layout { max-width: 64rem; margin: auto; gap: 24px; }
.ludi-preparation .ludi-question { border: 0; background: transparent; box-shadow: none; padding: 0; }
.ludi-preparation .ludi-question h1 { font-size: clamp(2rem,4vw,3rem); letter-spacing: -.04em; max-width: 20ch; margin-bottom: 14px; }
.is-choosing { display: flex !important; flex-direction: column-reverse; }
.is-choosing > * { width: 100%; }
.is-choosing :deep(.ludi-room-info summary) { padding-block: 10px; }
.social-context-options { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.social-context-options label { position: relative; flex-direction: column; text-align: center; justify-content: start; padding: 1rem !important; border-radius: 18px !important; box-shadow: none !important; background: #fffdf6 !important; }
.social-context-options label.selected, .social-mode-options label.selected { background: #eaf2e4 !important; border-color: #29835a !important; }
.social-context-copy strong, .social-context-copy small { display: block; }
.social-context-copy small { margin-top: 5px; font-size: 13px; font-weight: 400; color: #526455; line-height: 1.35; }
.social-context-check, .social-mode-check { width: 23px; height: 23px; flex: none; border: 1px solid #8eaa92; border-radius: 50%; font-size: .8rem; display: grid; place-items: center; }
.social-context-check { position: absolute; top: .5rem; right: .5rem; }
.selected .social-context-check, .selected .social-mode-check { color: white; background: #287950; border-color: #287950; }
.social-mode-options { gap: 14px; }
.social-mode-options label { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding: 20px !important; background: #fffdf6; border-radius: 20px; box-shadow: none; font-weight: 400; }
.social-mode-top { display: flex; gap: 10px; align-items: center; }
.social-mode-top :deep(.social-glyph) { width: 36px; height: 36px; }
.social-mode-source { flex: 1; color: #48634f; font-size: 12px; font-weight: 800; }
.social-mode-title { font-size: 25px; letter-spacing: -.035em; line-height: 1.1; }
.social-mode-description { font-size: 15px; line-height: 1.45; }
.social-mode-preparation { padding-top: 10px; border-top: 1px solid #d3dfcf; font-size: 13px; color: #48634f; line-height: 1.4; }
.social-mode-recommended { align-self: start; padding: 3px 8px; font-size: 11px; font-weight: 700; background: #f5e4af; border-radius: 6px; color: #605020; }
.social-mode-explainer section { border-top: 1px solid var(--l-line); padding-top: 18px; margin-top: 18px; }
.ludi-preparation .ludi-primary { border-radius: 999px; background: #246447; }
.ludi-preparation .ludi-primary:disabled { background: #dfe6da; color: #697766; opacity: 1; }
@media (min-width: 741px) {
  .social-mode-options { grid-template-columns: 1fr 1fr; }
  .social-context-options { grid-template-columns: repeat(3, 1fr); }
  .is-choosing .ludi-question h1 { max-width: none; }
}
@media (max-width: 600px) {
  .ludi-preparation .ludi-game-layout { display: flex; flex-direction: column-reverse; }
  .social-mode-options label { padding: 16px !important; gap: 8px; }
  .social-mode-title { font-size: 23px; }
}
</style>
