<script setup lang="ts">
import { discoverGames } from '@doot-games/games/ludi'
import type { LudiMode, LudiVibe } from '@doot-games/sdk/ludi'
import '../../assets/ludi.css'
import '../../assets/ludi-editorial.css'
import { presentLudiGame } from '../../utils/ludi-presentation'
useHead({ title: 'Ludi · Encontra o próximo momento', htmlAttrs: { lang: 'pt-PT' } })
useHead({ link: [{ key: 'ludi-editorial-font', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght,SOFT,WONK@0,700,30,1;1,700,30,1&display=swap' }] })
const mode = ref<LudiMode | ''>('')
const publicLudi = useRuntimeConfig().public.ludiPublicOnly
const players = ref(0)
const minutes = ref(0)
const vibe = ref<LudiVibe | ''>('')
const extraFilters = computed(() => [players.value, minutes.value, vibe.value].filter(Boolean).length)
const filtered = computed(() => !!mode.value || extraFilters.value > 0)
const games = computed(() => discoverGames({ mode: mode.value || undefined, players: Number(players.value) || undefined, minutes: Number(minutes.value) || undefined, vibe: vibe.value || undefined }))
const modes: { value: LudiMode | ''; label: string }[] = [
  { value: '', label: 'Todos' }, { value: 'solo', label: 'A solo' },
  { value: 'same-device', label: 'À mesa' }, { value: 'room', label: 'Online' },
]
const entries = computed(() => games.value.map(presentLudiGame))
function reset() { mode.value = ''; players.value = 0; minutes.value = 0; vibe.value = '' }
</script>
<template>
  <main class="ludi-page ludi-discovery ludi-editorial">
    <LudiHeader>
      <span class="ludi-masthead-note">O tempo é<br>para jogar.</span>
      <a class="ludi-masthead-link" href="#jogos">Escolhe o teu jogo <span aria-hidden="true">↘</span></a>
    </LudiHeader>
    <div class="ludi-main">
      <section class="ludi-intro" aria-labelledby="discovery-title">
        <p class="ludi-eyebrow">Pequenos jogos / bons encontros</p>
        <h1 id="discovery-title">Quem está<br><em>por aí?</em></h1>
        <div class="ludi-hero-seal" aria-hidden="true"><svg viewBox="0 0 160 160" fill="none"><path d="m80 1 13 22 24-9 2 26 26 2-9 24 23 14-23 14 9 24-26 2-2 26-24-9-13 22-14-22-24 9-2-26-26-2 9-24L1 80l22-14-9-24 26-2 2-26 24 9Z" fill="currentColor" /></svg><span>SÓ MAIS<strong>uma!</strong><i>↗</i></span></div>
        <div class="ludi-hero-note"><span class="ludi-note-line" aria-hidden="true" /><p>Uma pausa pequena.<br>Uma boa história depois.</p><span class="ludi-small">A solo, à mesa ou a dois à distância.</span></div>
      </section>
      <div id="jogos" class="ludi-selection-heading"><h2>Hoje, apetece…</h2><span>ESCOLHE A COMPANHIA</span></div>
      <form class="ludi-discovery-controls" aria-label="Encontrar um jogo" @submit.prevent>
        <fieldset class="ludi-mode-picker">
          <legend class="sr-only">Modo de jogo</legend>
          <label v-for="item in modes" :key="item.value" :class="{ selected: mode === item.value }">
            <input v-model="mode" type="radio" name="mode" :value="item.value" :aria-label="item.value === 'same-device' ? 'À mesa — no mesmo aparelho' : item.value === 'room' ? 'Online — um aparelho por pessoa' : item.label">
            <span>{{ item.label }}</span>
          </label>
        </fieldset>
        <details class="ludi-filter-details">
          <summary>Afinar a escolha <span v-if="extraFilters" class="ludi-filter-count">{{ extraFilters }}</span><span aria-hidden="true" class="ludi-detail-plus">+</span></summary>
          <div class="ludi-filters">
            <label>Pessoas<select v-model="players"><option :value="0">Qualquer número</option><option v-for="n in 6" :key="n" :value="n">{{ n }}</option></select></label>
            <label>Tempo disponível<select v-model="minutes"><option :value="0">Sem pressa</option><option :value="3">3 minutos</option><option :value="5">5 minutos</option><option :value="10">10 minutos</option><option :value="15">15 minutos</option></select></label>
            <label>Vibe<select v-model="vibe"><option value="">Todas</option><option value="chill">Tranquila</option><option value="funny">Para rir</option><option value="conversation">Conversa</option><option value="competitive">Competitiva</option><option value="thinking">Para pensar</option></select></label>
          </div>
          <p class="ludi-small">Os tempos são estimativas para uma partida.</p>
        </details>
      </form>
      <div class="ludi-catalog-heading">
        <p role="status" aria-live="polite">{{ games.length }} {{ games.length === 1 ? 'jogo à tua espera' : 'jogos à tua espera' }}</p>
        <button v-if="filtered" class="ludi-text-button" @click="reset">Limpar filtros</button>
      </div>
      <LudiCatalog v-if="games.length" :entries="entries" />
      <section v-else class="ludi-empty" aria-labelledby="empty-title">
        <span class="ludi-empty-mark" aria-hidden="true">↗</span>
        <h2 id="empty-title">Vamos tentar outra combinação?</h2>
        <p>Ainda não temos um jogo para esta escolha. Muda o tempo, as pessoas ou o modo.</p>
        <button class="ludi-secondary" @click="reset">Ver todos os jogos</button>
      </section>
      <footer class="ludi-editorial-footer"><span aria-hidden="true">✳</span><p>Jogar cabe<br><em>no teu dia.</em></p><small>Sem conta. Sem complicar.<br>Só mais uma partida.</small></footer>
      <p v-if="!publicLudi" class="ludi-small ludi-legacy-link"><NuxtLink to="/explore">Catálogo Doot (legado)</NuxtLink></p>
    </div>
  </main>
</template>
