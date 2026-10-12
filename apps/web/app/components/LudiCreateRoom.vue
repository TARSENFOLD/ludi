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
        <div class="ludi-entrance-kicker">
          <LudiGameMark game="entre-nos" />
          <span>Um jogo de conversa e descoberta</span>
        </div>
        <h1 id="entre-title">Entre <span>Nós<span class="ludi-entrance-star" aria-hidden="true">✳</span></span></h1>
        <p class="ludi-entrance-lead">Quanto sabes de quem está contigo?</p>
        <p class="ludi-entrance-description">Escolham, adivinhem e partilhem histórias. Há sempre algo novo para descobrir.</p>
      </section>

      <!-- Illustrative demo, not drawn from the server-only question bank and not playable. -->
      <div class="ludi-entrance-preview" aria-hidden="true">
        <div class="ludi-entrance-preview-top">
          <span>PRÉVIA ILUSTRATIVA</span>
          <div class="ludi-entrance-preview-players">
            <span>F</span><span>B</span><span>C</span>
          </div>
        </div>
        <div class="ludi-entrance-preview-card">
          <span class="ludi-entrance-preview-stage"><span class="ludi-entrance-preview-spark">✳</span> Uma escolha rápida</span>
          <p>Se pudesses escolher uma surpresa para amanhã?</p>
          <div class="ludi-entrance-preview-options">
            <div><LudiSocialGlyph label="descanso" />Ficar sossegado</div>
            <div class="is-selected"><LudiSocialGlyph label="passeio" />Sair a explorar <span>✓</span></div>
          </div>
        </div>
        <div class="ludi-entrance-preview-note"><span aria-hidden="true">✦</span> Cada resposta traz uma descoberta.</div>
      </div>

      <div class="ludi-entrance-fields">
        <label for="entre-name">Como te chamas?</label>
        <input id="entre-name" v-model="name" placeholder="Escreve o teu nome" autocomplete="nickname" maxlength="32" required :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? 'entre-create-error' : undefined">
        <p v-if="error" id="entre-create-error" class="ludi-error" role="alert">{{ error }}</p>
        <button type="submit" class="ludi-primary ludi-entrance-cta" :disabled="busy || !name.trim()">
          <span>{{ busy ? 'A criar a sala…' : 'Criar sala' }}</span><span aria-hidden="true">→</span>
        </button>
        <p class="ludi-entrance-meta">2–6 pessoas <span aria-hidden="true">·</span> Sem conta <span aria-hidden="true">·</span> Perto ou longe</p>
        <p class="ludi-entrance-after">O convite aparece logo a seguir. Cada pessoa joga no seu aparelho.</p>
      </div>

      <div class="ludi-entrance-more">
        <details class="ludi-form-details">
          <summary>Como funciona?</summary>
          <ol>
            <li>Cria uma sala e partilha o convite.</li>
            <li>Escolhem o contexto e, se quiserem, acrescentam perguntas próprias.</li>
            <li>Respondam, prevejam e descubram juntos. Também podem contar histórias por texto ou oralmente.</li>
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
/* Only the Entre Nós first screen changes. Game sessions and the other entries are untouched. */
.ludi-entrance-page { --l-action: #24684b; --l-action-hover: #195239; }
.ludi-entrance-page :deep(.ludi-top) { margin-bottom: clamp(12px, 3vh, 26px); }
.ludi-entrance-shell {
  width: min(100%, 1030px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, .96fr);
  grid-template-areas: 'intro preview' 'fields preview' 'more preview';
  column-gap: clamp(32px, 6vw, 84px);
  align-items: center;
}
.ludi-entrance-intro { grid-area: intro; min-width: 0; }
.ludi-entrance-kicker { display: flex; align-items: center; gap: 11px; color: #56665d; font-size: 12px; font-weight: 800; letter-spacing: .065em; text-transform: uppercase; margin-bottom: 14px; }
.ludi-entrance-kicker :deep(.ludi-game-mark) { width: 37px; height: 37px; }
.ludi-entrance-intro h1 { font-size: clamp(58px, 7vw, 94px); line-height: .96; letter-spacing: -.07em; margin: 0 0 20px; }
.ludi-entrance-intro h1 > span { white-space: nowrap; }
.ludi-entrance-star { display: inline-block; vertical-align: top; color: #d8a94d; font-size: .33em; margin-left: .11em; transform: rotate(-14deg); }
.ludi-entrance-lead { font-size: clamp(22px, 2.45vw, 29px); font-weight: 800; line-height: 1.16; letter-spacing: -.025em; max-width: 25ch; margin-bottom: 12px !important; }
.ludi-entrance-description { font-size: 16px; line-height: 1.45; color: var(--l-muted); max-width: 36ch; margin-bottom: 24px !important; }
.ludi-entrance-fields { grid-area: fields; min-width: 0; }
.ludi-entrance-fields label { display: block; font-size: 15px; font-weight: 800; margin-bottom: 6px; }
.ludi-entrance-page .ludi-entrance-fields input { margin: 0 0 12px; background: #fffefa; border-color: #bccfc1; border-radius: 15px; min-height: 54px; padding-inline: 16px; }
.ludi-entrance-cta { min-height: 58px; border-radius: 15px; font-size: 17px; display: flex; justify-content: center; }
.ludi-entrance-cta span:last-child { font-size: 22px; line-height: 1; }
.ludi-entrance-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--l-muted); margin: 14px 0 5px !important; }
.ludi-entrance-after { text-align: center; color: var(--l-muted); font-size: 13px; line-height: 1.35; margin: 0 !important; }
.ludi-entrance-more { grid-area: more; min-width: 0; margin-top: 16px; }
.ludi-entrance-more :deep(.ludi-form-details) { margin-top: 0; }
.ludi-entrance-more :deep(.ludi-form-details summary) { font-size: 13px; }
.ludi-entrance-more :deep(.ludi-form-details ol) { padding-left: 22px; }
.ludi-entrance-more :deep(.ludi-form-details li) { margin-bottom: 8px; }
.ludi-entrance-preview {
  grid-area: preview; min-width: 0; min-height: 495px; align-self: center;
  border-radius: 36px;
  background: #e7eee5;
  padding: clamp(20px, 3.4vw, 35px);
  display: flex; flex-direction: column; justify-content: center;
  position: relative; overflow: hidden;
}
.ludi-entrance-preview::before { content: ''; position: absolute; width: 180px; height: 180px; background: #d2e4d5; border-radius: 50%; top: -75px; right: -35px; }
.ludi-entrance-preview::after { content: ''; position: absolute; width: 130px; height: 130px; border: 20px solid #d8e6d4; border-radius: 50%; bottom: -70px; left: -40px; }
.ludi-entrance-preview-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 20px; font-size: 10px; line-height: 1.25; font-weight: 800; letter-spacing: .08em; color: #526d5c; }
.ludi-entrance-preview-players { display: flex; padding-right: 5px; }
.ludi-entrance-preview-players span { display: grid; place-items: center; width: 33px; height: 33px; border-radius: 50%; font-size: 13px; letter-spacing: 0; color: #173e2b; background: #ecd08d; border: 3px solid #e7eee5; margin-right: -8px; }
.ludi-entrance-preview-players span:nth-child(2) { background: #bcd7c5; }
.ludi-entrance-preview-players span:nth-child(3) { background: #d9c8ec; }
.ludi-entrance-preview-card { background: #fffdfa; border: 1px solid #d3dfd3; padding: 26px 20px 20px; border-radius: 27px; box-shadow: 0 16px 35px #24583b12; position: relative; z-index: 1; transform: rotate(-1.5deg); }
.ludi-entrance-preview-stage { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 12px; color: #426c54; }
.ludi-entrance-preview-spark { font-size: 18px; color: #e7b14b; }
.ludi-entrance-preview-card > p { font-size: clamp(24px, 2.7vw, 32px); font-weight: 800; line-height: 1.1; letter-spacing: -.045em; margin: 16px 0 19px !important; }
.ludi-entrance-preview-options { display: grid; gap: 9px; }
.ludi-entrance-preview-options > div { background: #fcfbf7; border: 1.5px solid #d9dfd6; border-radius: 15px; padding: 10px; min-height: 60px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 800; }
.ludi-entrance-preview-options > .is-selected { background: #e4f2e7; border-color: #278a5d; }
.ludi-entrance-preview-options :deep(.social-glyph) { width: 37px; height: 37px; }
.ludi-entrance-preview-options .is-selected > span { display: grid; place-items: center; background: #247e56; color: white; border-radius: 50%; width: 25px; height: 25px; margin-left: auto; flex: none; }
.ludi-entrance-preview-note { position: relative; z-index: 1; display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 20px; font-size: 13px; font-weight: 700; color: #456755; text-align: center; }
.ludi-entrance-preview-note > span { font-size: 20px; color: #cc9440; }
@media (max-width: 740px) {
  .ludi-entrance-page { padding-inline: max(20px, env(safe-area-inset-left)) max(20px, env(safe-area-inset-right)); }
  .ludi-entrance-shell { max-width: 470px; grid-template-columns: minmax(0,1fr); grid-template-areas: 'intro' 'preview' 'fields' 'more'; gap: 0; }
  .ludi-entrance-intro h1 { font-size: clamp(58px, 15vw, 75px); margin-bottom: 11px; }
  .ludi-entrance-lead { font-size: 22px; margin-bottom: 8px !important; }
  .ludi-entrance-description { font-size: 15px; line-height: 1.35; margin-bottom: 15px !important; }
  .ludi-entrance-kicker { margin-bottom: 7px; font-size: 11px; }
  .ludi-entrance-kicker :deep(.ludi-game-mark) { width: 28px; height: 28px; }
  .ludi-entrance-preview { min-height: unset; padding: 15px; border-radius: 22px; margin-bottom: 19px; }
  .ludi-entrance-preview-top { margin-bottom: 7px; }
  .ludi-entrance-preview-card { transform: none; border-radius: 18px; padding: 13px 15px 12px; }
  .ludi-entrance-preview-card > p { font-size: 22px; line-height: 1.1; margin: 5px 0 11px !important; max-width: 19ch; }
  .ludi-entrance-preview-stage { font-size: 11px; }
  .ludi-entrance-preview-options { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
  .ludi-entrance-preview-options > div { padding: 6px; min-height: 55px; font-size: 12px; gap: 5px; line-height: 1.15; }
  .ludi-entrance-preview-options :deep(.social-glyph) { width: 30px; height: 30px; }
  .ludi-entrance-preview-options .is-selected > span { width: 18px; height: 18px; font-size: 11px; }
  .ludi-entrance-preview-note { margin-top: 7px; font-size: 12px; }
  .ludi-entrance-fields label { font-size: 14px; }
  .ludi-entrance-page .ludi-entrance-fields input { min-height: 50px; margin-bottom: 9px; }
  .ludi-entrance-cta { min-height: 54px; }
  .ludi-entrance-meta { margin-top: 10px !important; }
  .ludi-entrance-more { margin-top: 12px; }
}
@media (max-width: 360px) {
  .ludi-entrance-kicker { font-size: 10px; }
  .ludi-entrance-intro h1 { font-size: 54px; }
  .ludi-entrance-preview-top { font-size: 9px; }
  .ludi-entrance-preview-options > div { font-size: 11px; }
  .ludi-entrance-preview-options :deep(.social-glyph) { width: 26px; height: 26px; }
}
@media (max-height: 700px) and (max-width: 740px) {
  .ludi-entrance-page :deep(.ludi-top) { margin-bottom: 8px; }
  .ludi-entrance-description { margin-bottom: 9px !important; }
  .ludi-entrance-preview { padding: 11px; margin-bottom: 12px; }
  .ludi-entrance-preview-top, .ludi-entrance-preview-note { display: none; }
}

@media (max-height: 540px) and (min-width: 741px) {
  .ludi-entrance-page { padding-block: 12px; }
  .ludi-entrance-page :deep(.ludi-top) { min-height: 36px; margin-bottom: 6px; }
  .ludi-entrance-kicker { font-size: 10px; margin-bottom: 4px; }
  .ludi-entrance-kicker :deep(.ludi-game-mark) { width: 26px; height: 26px; }
  .ludi-entrance-intro h1 { font-size: 47px; margin-bottom: 6px; }
  .ludi-entrance-lead { font-size: 18px; margin-bottom: 5px !important; }
  .ludi-entrance-description { font-size: 13px; margin-bottom: 8px !important; }
  .ludi-entrance-fields label { margin-bottom: 3px; font-size: 13px; }
  .ludi-entrance-page .ludi-entrance-fields input { min-height: 42px; margin-bottom: 6px; padding-block: 7px; }
  .ludi-entrance-cta { min-height: 44px; }
  .ludi-entrance-meta { margin-top: 6px !important; font-size: 11px; }
  .ludi-entrance-after { display: none; }
  .ludi-entrance-more { margin-top: 0; }
  .ludi-entrance-preview { min-height: 290px; padding: 16px; }
  .ludi-entrance-preview-top { margin-bottom: 8px; }
  .ludi-entrance-preview-card { transform: none; padding: 12px; border-radius: 18px; }
  .ludi-entrance-preview-card > p { font-size: 22px; margin: 7px 0 !important; }
  .ludi-entrance-preview-options > div { min-height: 42px; padding: 5px; }
  .ludi-entrance-preview-options :deep(.social-glyph) { width: 28px; height: 28px; }
  .ludi-entrance-preview-note { margin-top: 8px; }
}

</style>
