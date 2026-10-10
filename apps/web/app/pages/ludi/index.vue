<script setup lang="ts">
import { discoverGames } from '@doot-games/games/ludi'
import type { LudiMode, LudiVibe } from '@doot-games/sdk/ludi'
import '../../assets/ludi.css'
useHead({ title: 'Ludi · Encontra o próximo momento', htmlAttrs: { lang: 'pt-PT' } })
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
  { value: 'same-device', label: 'Mesmo aparelho' }, { value: 'room', label: 'À distância' },
]
const labels = { solo: 'Jogar a solo', 'same-device': 'Passar o aparelho', room: 'Jogar a dois' }
function reset() { mode.value = ''; players.value = 0; minutes.value = 0; vibe.value = '' }
</script>
<template>
  <main class="ludi-page ludi-discovery">
    <LudiHeader context="Uma pausa bem passada." />
    <div class="ludi-main">
      <section class="ludi-intro" aria-labelledby="discovery-title">
        <p class="ludi-eyebrow">Pequenos jogos. Bons momentos.</p>
        <h1 id="discovery-title">Quem está<br>por aí?</h1>
        <p class="ludi-lead">Só tu, a mesa toda ou alguém do outro lado. Há sempre tempo para jogar.</p>
      </section>
      <form class="ludi-discovery-controls" aria-label="Encontrar um jogo" @submit.prevent>
        <fieldset class="ludi-mode-picker">
          <legend class="sr-only">Modo de jogo</legend>
          <label v-for="item in modes" :key="item.value" :class="{ selected: mode === item.value }">
            <input v-model="mode" type="radio" name="mode" :value="item.value">
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
      <div v-if="games.length" class="ludi-catalog">
        <article v-for="game in games" :key="game.id" class="ludi-game-tile" :class="game.id === 'entre-nos' ? 'is-social' : 'is-quiz'">
          <div class="ludi-tile-top"><LudiGameMark :game="game.id" /><span class="ludi-eyebrow">{{ game.id === 'entre-nos' ? 'Para dar conversa' : 'Põe-te à prova' }}</span></div>
          <h2>{{ game.name }}</h2>
          <p class="ludi-tile-description">{{ game.description }}</p>
          <div class="ludi-tile-actions">
            <NuxtLink v-for="spec in game.modes" :key="spec.mode" class="ludi-game-link" :to="spec.mode === 'room' ? '/duo' : `/ludi/desafio-rapido?modo=${spec.mode}`">
              <span><strong>{{ labels[spec.mode] }}</strong><small>{{ spec.players.min === spec.players.max ? spec.players.min : `${spec.players.min}–${spec.players.max}` }} {{ spec.players.max === 1 ? 'pessoa' : 'pessoas' }} · cerca de {{ spec.duration.typical }} min</small></span>
              <span class="ludi-link-arrow" aria-hidden="true">↗</span>
            </NuxtLink>
          </div>
        </article>
      </div>
      <section v-else class="ludi-empty" aria-labelledby="empty-title">
        <span class="ludi-empty-mark" aria-hidden="true">↗</span>
        <h2 id="empty-title">Vamos tentar outra combinação?</h2>
        <p>Ainda não temos um jogo para esta escolha. Muda o tempo, as pessoas ou o modo.</p>
        <button class="ludi-secondary" @click="reset">Ver todos os jogos</button>
      </section>
      <p class="ludi-discovery-note">Sem conta. Sem complicar. Só mais uma partida.</p>
      <p v-if="!publicLudi" class="ludi-small ludi-legacy-link"><NuxtLink to="/explore">Catálogo Doot (legado)</NuxtLink></p>
    </div>
  </main>
</template>
