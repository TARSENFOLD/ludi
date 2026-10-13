<script setup lang="ts">
import type { LudiView } from "@doot-games/games/ludi/contracts";
import { seenQuestionIds } from '../utils/ludi-question-history'
import { ludiActionId } from '../utils/ludi-session'
import '../assets/ludi.css'

const props = defineProps<{
  gameId: 'entre-nos' | 'na-mesma-onda' | 'jogo-da-velha'
  experience?: 'social'
  landing?: boolean
}>()
const onda = computed(() => props.gameId === 'na-mesma-onda')
const velha = computed(() => props.gameId === 'jogo-da-velha')
const entrance = computed(() => props.landing && props.experience === 'social' && props.gameId === 'entre-nos')
const title = computed(() => velha.value ? 'Jogo da Velha' : onda.value ? 'Na Mesma Onda' : 'Entre Nós')
useHead(() => ({ title: `${title.value} · Ludi`, htmlAttrs: { lang: 'pt-PT' } }))

const name = ref('')
const busy = ref(false)
const error = ref('')
let request: { name: string; id: string; gameId: string; experience?: "social"; seenQuestionIds?: string[] } | undefined
async function createRoom() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    if (!request || request.name !== name.value || request.gameId !== props.gameId || request.experience !== props.experience) {
      request = {
        name: name.value, id: ludiActionId(), gameId: props.gameId,
        ...(props.experience ? { experience: props.experience, seenQuestionIds: seenQuestionIds() } : {}),
      }
    }
    const view = await $fetch<LudiView>('/api/ludi/rooms', { method: 'POST', body: request })
    await navigateTo(`/ludi/salas/${view.code}`)
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } }).data?.message ?? 'Não foi possível criar a sala. Tenta novamente.'
  } finally { busy.value = false }
}
</script>

<template>
  <main class="ludi-page" :class="{ 'ludi-entrance-page': entrance }">
    <LudiHeader :context="title" />

    <!-- Entre Nós: one purposeful first screen, no redundant Start -> Create room step. -->
    <form v-if="entrance" class="ludi-entrance-shell" :aria-busy="busy" @submit.prevent="createRoom">
      <section class="ludi-entrance-intro" aria-labelledby="entre-title">
        <LudiEntreArtwork class="ludi-entrance-emblem" scene="brand" />
        <p class="ludi-entrance-kicker">Um jogo de conversa e descoberta</p>
        <h1 id="entre-title">Entre Nós</h1>
        <p class="ludi-entrance-lead">Quanto sabes de quem<br>joga contigo?</p>
        <p class="ludi-entrance-description">Escolham, adivinhem e partilhem histórias por texto. Cada um no seu aparelho.</p>
      </section>

      <!-- Illustrative demo, not drawn from the server-only question bank and not playable. -->
      <div class="ludi-entrance-preview" aria-hidden="true">
        <span class="ludi-entrance-preview-caption">Prévia ilustrativa</span>
        <div class="ludi-entrance-preview-card">
          <span class="ludi-entrance-preview-stage">Uma escolha rápida</span>
          <p>Que surpresa escolherias para amanhã?</p>
          <div class="ludi-entrance-preview-options">
            <div><LudiEntreArtwork scene="rest" /><span><i></i>Ficar sossegado</span></div>
            <div class="is-selected"><LudiEntreArtwork scene="explore" /><span><i>✓</i>Sair a explorar</span></div>
          </div>
        </div>
        <p class="ludi-entrance-preview-note">Vocês escolhem. Depois, descobrem juntos.</p>
      </div>

      <div class="ludi-entrance-fields">
        <label for="entre-name">Como te chamas?</label>
        <input id="entre-name" v-model="name" placeholder="Escreve o teu nome" autocomplete="nickname" enterkeyhint="go" maxlength="32" required :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? 'entre-create-error' : undefined">
        <p v-if="error" id="entre-create-error" class="ludi-error" role="alert">{{ error }}</p>
        <button type="submit" class="ludi-primary ludi-entrance-cta" :disabled="busy || !name.trim()">
          <span>{{ busy ? 'A criar a sala…' : 'Criar sala' }}</span><span aria-hidden="true">→</span>
        </button>
        <p class="ludi-entrance-meta">2–6 pessoas <span aria-hidden="true">·</span> Sem conta <span aria-hidden="true">·</span> Online</p>
        <p class="ludi-entrance-after">O convite aparece a seguir. Podem jogar à distância.</p>
      </div>

      <div class="ludi-entrance-more">
        <details class="ludi-form-details">
          <summary>Como funciona?</summary>
          <ol>
            <li>Cria uma sala e partilha o convite.</li>
            <li>Escolhem o contexto e, se quiserem, acrescentam perguntas próprias.</li>
            <li>Respondam, prevejam e descubram juntos. As histórias são partilhadas por texto; passar é sempre uma opção.</li>
          </ol>
        </details>
        <LudiQuestionHistory />
        <details class="ludi-form-details">
          <summary>E se eu sair a meio?</summary>
          <p>Volta ao convite no mesmo browser para retomar. A sala dura até oito horas, mas termina se o servidor reiniciar.</p>
        </details>
      </div>
    </form>

    <!-- Keep the existing room-creation flow for the other Ludi games. -->
    <form v-else class="ludi-narrow ludi-setup" :aria-busy="busy" @submit.prevent="createRoom">
      <div class="ludi-form-heading">
        <LudiGameMark :game="gameId" />
        <p class="ludi-eyebrow">{{ velha ? '2 pessoas · cerca de 2 min' : onda ? '2–6 pessoas · cerca de 6 min' : props.experience ? '2–6 pessoas · cerca de 10–15 min' : '2 pessoas · cerca de 5 min' }}</p>
        <h1>{{ velha ? 'Quem faz três em linha?' : onda ? 'Estão na mesma onda?' : props.experience ? 'Quem se junta?' : 'Uma pausa a dois.' }}</h1>
        <p class="ludi-lead">{{ velha ? 'Cria a sala e envia o convite. Cada pessoa joga no seu aparelho, uma jogada de cada vez.' : onda ? 'Seis temas, uma escala. Cada um escolhe, depois descobrem a sintonia do grupo.' : props.experience ? 'Cria a sala e envia o convite. Depois escolhem o contexto e preparam a conversa.' : 'Cria a sala, envia o convite. Quatro rondas para descobrir o que vos liga.' }}</p>
      </div>
      <p v-if="onda" class="ludi-small">Sem resposta certa e sem pressa. A dois, contam os pontos da dupla; em grupo, a proximidade à média.</p>
      <label for="name">Como te chamas?</label>
      <input id="name" v-model="name" placeholder="O teu nome" autocomplete="nickname" maxlength="32" required :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? 'create-error' : undefined">
      <p v-if="error" id="create-error" class="ludi-error" role="alert">{{ error }}</p>
      <button class="ludi-primary" :disabled="busy || !name.trim()"><span>{{ busy ? 'A criar a sala…' : 'Criar sala' }}</span><span aria-hidden="true">→</span></button>
      <p class="ludi-small ludi-form-note">Sem conta. Um aparelho por pessoa.</p>
      <LudiQuestionHistory v-if="experience" />
      <details class="ludi-form-details"><summary>E se eu sair a meio?</summary><p>Volta ao convite neste browser para retomar. A sala dura até oito horas e termina se o servidor reiniciar.</p></details>
    </form>
  </main>
</template>

<style scoped>
.ludi-entrance-page { --l-action: #205e43; --l-action-hover: #174b34; }
.ludi-entrance-page :deep(.ludi-top) { margin-bottom: 20px; }
.ludi-entrance-shell { width: min(100%, 1000px); margin: auto; display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: 'intro preview' 'fields preview' 'more more'; gap: 20px 60px; align-items: center; }
.ludi-entrance-intro { grid-area: intro; text-align: center; }
.ludi-entrance-intro .ludi-entrance-emblem { width: 124px; margin: 0 auto 12px; }
.ludi-entrance-kicker { color: #47745b; text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: .14em; margin-bottom: 10px !important; }
.ludi-entrance-intro h1 { color: #123f30; font-size: clamp(54px, 6vw, 78px); line-height: 1; letter-spacing: -.06em; margin-bottom: 12px; }
.ludi-entrance-lead { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; line-height: 1.15; letter-spacing: -.035em; margin-bottom: 12px !important; }
.ludi-entrance-description { font-size: 16px; line-height: 1.4; color: var(--l-muted); max-width: 36ch; margin: 0 auto !important; text-wrap: pretty; }
.ludi-entrance-fields { grid-area: fields; min-width: 0; }
.ludi-entrance-fields label { display: block; font-size: 17px; font-weight: 800; margin-bottom: 6px; }
.ludi-entrance-page .ludi-entrance-fields input { margin: 0 0 12px; background: #fffdfa; border-color: #c8cec5; border-radius: 12px; min-height: 50px; padding-inline: 16px; }
.ludi-entrance-cta { min-height: 56px; border-radius: 999px; font-size: 19px; justify-content: center; gap: 14px; }
.ludi-entrance-cta span:last-child { font-size: 24px; line-height: 1; }
.ludi-entrance-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: 13px; color: var(--l-muted); margin: 12px 0 4px !important; }
.ludi-entrance-after { text-align: center; color: var(--l-muted); font-size: 12px; line-height: 1.4; margin: 0 !important; }
.ludi-entrance-more { grid-area: more; width: min(100%, 560px); margin: 8px auto 0; border-top: 1px solid var(--l-line); padding-top: 12px; }
.ludi-entrance-more :deep(.ludi-form-details) { border: 0; border-radius: 12px; background: #f0f0e9; margin: 0 0 6px; padding: 0 14px; }
.ludi-entrance-more :deep(summary) { min-height: 46px; padding-block: 12px; font-size: 14px; }
.ludi-entrance-more :deep(.ludi-form-details ol) { padding: 0 0 12px 22px; }
.ludi-entrance-more :deep(.ludi-form-details li) { margin-bottom: 8px; }
.ludi-entrance-preview { grid-area: preview; min-width: 0; padding: 22px; border-radius: 32px; background: #dce9d5; position: relative; overflow: hidden; }
.ludi-entrance-preview::before { content: ''; position: absolute; width: 190px; height: 330px; background: #b5cfa8; border-radius: 50%; left: -100px; top: 60px; transform: rotate(-25deg); }
.ludi-entrance-preview::after { content: ''; position: absolute; width: 180px; height: 160px; border-radius: 50%; background: #c6d5a4; right: -80px; bottom: -60px; }
.ludi-entrance-preview-caption { display: inline-block; position: relative; padding: 5px 10px; border-radius: 999px; background: #f6f8f0; color: #536a59; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 14px; }
.ludi-entrance-preview-card { background: #fffdfa; padding: 20px 16px 16px; border-radius: 24px; position: relative; z-index: 1; text-align: center; box-shadow: 0 10px 25px #244b3110; }
.ludi-entrance-preview-stage { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f7dfa0; }
.ludi-entrance-preview-card > p { font-size: 24px; font-weight: 800; line-height: 1.15; letter-spacing: -.03em; margin: 12px auto 16px !important; max-width: 23ch; text-wrap: balance; }
.ludi-entrance-preview-options { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.ludi-entrance-preview-options > div { border: 1.5px solid transparent; background: #f3f2ec; border-radius: 15px; padding: 8px; min-width: 0; }
.ludi-entrance-preview-options > .is-selected { background: #eaf2e4; border-color: #246447; }
.ludi-entrance-preview-options .entre-art { max-height: 110px; }
.ludi-entrance-preview-options span { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; font-weight: 700; line-height: 1.2; margin-top: 4px; }
.ludi-entrance-preview-options i { font-style: normal; width: 20px; height: 20px; flex: none; border: 1.5px solid #a8b0a4; border-radius: 50%; background: white; display: grid; place-items: center; }
.is-selected i { background: #246447; color: white; border-color: #246447; }
.ludi-entrance-preview-note { position: relative; z-index: 1; margin: 12px 0 0 !important; text-align: center; font-size: 12px; color: #3d634b; }
@media (max-width: 740px) {
  .ludi-entrance-page :deep(.ludi-top) { margin-bottom: 8px; }
  .ludi-entrance-shell { max-width: 440px; grid-template-columns: minmax(0,1fr); grid-template-areas: 'intro' 'preview' 'fields' 'more'; gap: 18px; }
  .ludi-entrance-intro .ludi-entrance-emblem { width: 98px; margin-bottom: 8px; }
  .ludi-entrance-kicker { font-size: 9px; letter-spacing: .11em; margin-bottom: 8px !important; }
  .ludi-entrance-intro h1 { font-size: clamp(52px, 14.5vw, 66px); margin-bottom: 8px; }
  .ludi-entrance-lead { font-size: 23px; margin-bottom: 8px !important; }
  .ludi-entrance-description { font-size: 14px; max-width: 36ch; }
  .ludi-entrance-preview { padding: 12px; border-radius: 24px; }
  .ludi-entrance-preview-caption { margin-bottom: 8px; padding: 3px 8px; font-size: 8px; }
  .ludi-entrance-preview-card { padding: 12px 10px 10px; border-radius: 18px; }
  .ludi-entrance-preview-stage { font-size: 10px; padding: 3px 8px; }
  .ludi-entrance-preview-card > p { font-size: 19px; margin: 8px auto 10px !important; }
  .ludi-entrance-preview-options > div { padding: 5px; border-radius: 12px; }
  .ludi-entrance-preview-options .entre-art { max-height: 76px; }
  .ludi-entrance-preview-options span { font-size: 11px; }
  .ludi-entrance-preview-options i { width: 17px; height: 17px; font-size: 10px; }
  .ludi-entrance-preview-note { display: none; }
  .ludi-entrance-fields label { font-size: 16px; }
  .ludi-entrance-more { margin-top: 0; }
}
@media (max-width: 360px) {
  .ludi-entrance-shell { gap: 14px; }
  .ludi-entrance-intro .ludi-entrance-emblem { width: 86px; }
  .ludi-entrance-lead { font-size: 21px; }
  .ludi-entrance-preview-options span { font-size: 10px; }
  .ludi-entrance-preview-options i { width: 14px; height: 14px; }
}
@media (max-height: 540px) and (min-width: 741px) {
  .ludi-entrance-shell { gap: 16px 32px; }
  .ludi-entrance-intro .ludi-entrance-emblem { width: 65px; margin-bottom: 4px; }
  .ludi-entrance-intro h1 { font-size: 48px; }
  .ludi-entrance-lead { font-size: 21px; }
  .ludi-entrance-description { font-size: 13px; }
  .ludi-entrance-preview { padding: 16px; }
  .ludi-entrance-preview-card > p { font-size: 20px; }
}
</style>
