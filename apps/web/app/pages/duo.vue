<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ layout: false })
useHead({ title: 'Ludi — jogar juntos', htmlAttrs: { lang: 'pt' } })

function savedName(): string {
  try { return typeof localStorage === 'undefined' ? '' : localStorage.getItem('ludi:name') ?? '' }
  catch { return '' }
}
const name = ref(savedName())
const started = ref(false)
const sessionContext = 'duo:p:entre-nos'
function hasSession(): boolean {
  try {
    const entry = JSON.parse(sessionStorage.getItem('doot-host-rooms') ?? '{}')[sessionContext]
    return !!entry?.room && Date.now() - entry.ts < 6 * 60 * 60 * 1000
  } catch { return false }
}
const canResume = ref(hasSession())

function start() {
  name.value = name.value.trim().slice(0, 24)
  if (!name.value) return
  try { localStorage.setItem('ludi:name', name.value) } catch { /* optional */ }
  started.value = true
}
function createNew() {
  if (!name.value.trim()) return
  resetHostSession(sessionContext)
  canResume.value = false
  start()
}
</script>

<template>
  <ClientOnly>
    <HostRoom v-if="started" plugin-id="entre-nos" :duo-name="name" />
    <main v-else class="duo-home">
      <div class="duo-intro">
        <p class="eyebrow">Ludi · primeiro jogo</p>
        <h1>Dois dispositivos.<br /><em>Uma boa pausa.</em></h1>
        <p>Cria uma sala, partilha o código e joga com outra pessoa. Sem conta e sem ecrã extra.</p>
      </div>
      <form class="setup" @submit.prevent="start">
        <h2>Começar a jogar</h2>
        <label for="duo-name">Como te chamamos?</label>
        <input id="duo-name" v-model="name" autocomplete="nickname" maxlength="24" placeholder="O teu nome" required />
        <div class="game-option chosen"><span><strong>Entre Nós</strong><small>Quatro rondas para descobrir, conversar e rir a dois</small></span></div>
        <button type="submit">{{ canResume ? 'Retomar sala' : 'Criar sala' }} <span aria-hidden="true">↗</span></button>
        <button v-if="canResume" type="button" class="new-session" @click="createNew">Criar nova sala</button>
        <p class="setup-note">Basta partilhar o convite. A outra pessoa entra pelo próprio dispositivo.</p>
      </form>
    </main>
    <template #fallback><div class="boot">A preparar o Ludi…</div></template>
  </ClientOnly>
</template>

<style scoped>
.duo-home { min-height: 100dvh; display: grid; grid-template-columns: 1fr minmax(320px, 440px); gap: clamp(24px, 6vw, 90px); align-items: center; max-width: 1180px; padding: 32px; margin: auto; color: #20322b; }
.duo-intro { max-width: 600px; }
.eyebrow { text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 900; color: #536d5d; }
h1 { font-size: clamp(44px, 6vw, 86px); line-height: 1.02; letter-spacing: -.055em; margin: 18px 0 24px; font-weight: 900; }
h1 em { color: #e37850; font-style: normal; }
.duo-intro > p:last-child { font-size: clamp(17px, 2vw, 21px); line-height: 1.5; max-width: 43ch; }
.setup { display: flex; flex-direction: column; gap: 12px; padding: 28px; border-radius: 24px; background: #fff; box-shadow: 0 16px 60px #243b2b1a; }
h2 { font-size: 25px; margin: 0 0 12px; }
.setup > label, legend { font-size: 13px; font-weight: 800; }
.setup > input { border: 1px solid #aeb9ad; border-radius: 12px; padding: 14px; font: inherit; }
.setup > input:focus-visible, button:focus-visible, .game-option:focus-within { outline: 3px solid #e37850; outline-offset: 2px; }
fieldset { border: 0; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
legend { margin-bottom: 10px; }
.game-option { display: flex; align-items: center; gap: 12px; border: 1px solid #cfd8cd; border-radius: 13px; padding: 14px; cursor: pointer; }
.game-option.chosen { border-color: #244d35; background: #f1f8ee; }
.game-option span { display: flex; flex-direction: column; gap: 4px; }
.game-option strong { font-size: 15px; }
.game-option small { line-height: 1.35; color: #5a675e; }
button { display: flex; justify-content: space-between; border: 0; border-radius: 12px; padding: 15px 18px; background: #244d35; color: white; font: inherit; font-weight: 800; cursor: pointer; }
.new-session { justify-content: center; background: #e9f0e6; color: #244d35; }
.setup-note { font-size: 12px; color: #738077; line-height: 1.4; margin: 4px 0 0; }
.boot { min-height: 100dvh; display: grid; place-items: center; }
@media (max-width: 760px) { .duo-home { grid-template-columns: 1fr; gap: 24px; padding: 24px 14px; } .setup { padding: 22px; } }
</style>
