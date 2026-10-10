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
const games = computed(() => discoverGames({ mode: mode.value || undefined, players: Number(players.value) || undefined, minutes: Number(minutes.value) || undefined, vibe: vibe.value || undefined }))
const labels = { solo: 'A solo', 'same-device': 'No mesmo aparelho', room: 'Cada um no seu aparelho' }
function reset() { mode.value = ''; players.value = 0; minutes.value = 0; vibe.value = '' }
</script>
<template>
  <main class="ludi-page">
    <header class="ludi-top"><NuxtLink to="/ludi">Ludi</NuxtLink><span>Jogar cabe no teu dia.</span></header>
    <div class="ludi-main"><p class="ludi-eyebrow">Escolhe o momento</p><h1>Quem está por aí?</h1><p>Uma pausa a solo, um aparelho à volta da mesa ou uma sala para dois.</p>
      <form class="ludi-filters" aria-label="Encontrar um jogo" @submit.prevent>
        <label>Modo<select v-model="mode"><option value="">Todos</option><option value="solo">A solo</option><option value="same-device">Mesmo aparelho</option><option value="room">Sala online</option></select></label>
        <label>Pessoas<select v-model="players"><option :value="0">Qualquer número</option><option v-for="n in 6" :key="n" :value="n">{{ n }}</option></select></label>
        <label>Tempo disponível<select v-model="minutes"><option :value="0">Sem pressa</option><option :value="3">3 minutos</option><option :value="5">5 minutos</option><option :value="10">10 minutos</option><option :value="15">15 minutos</option></select></label>
        <label>Vibe<select v-model="vibe"><option value="">Todas</option><option value="chill">Tranquila</option><option value="funny">Para rir</option><option value="conversation">Conversa</option><option value="competitive">Competitiva</option><option value="thinking">Para pensar</option></select></label>
      </form>
      <p class="ludi-small">As durações são estimativas. O filtro usa o tempo típico de cada modo.</p>
      <p role="status">{{ games.length }} {{ games.length === 1 ? 'jogo disponível' : 'jogos disponíveis' }}</p>
      <div v-if="games.length" class="ludi-catalog">
        <article v-for="game in games" :key="game.id" class="ludi-card"><p class="ludi-eyebrow">{{ game.access.tier === 'free' ? 'Grátis' : '' }}</p><h2>{{ game.name }}</h2><p>{{ game.description }}</p>
          <div v-for="spec in game.modes" :key="spec.mode"><p class="ludi-small">{{ spec.players.min === spec.players.max ? spec.players.min : `${spec.players.min}–${spec.players.max}` }} {{ spec.players.max === 1 ? 'pessoa' : 'pessoas' }} · cerca de {{ spec.duration.typical }} min</p>
            <NuxtLink class="ludi-secondary" :to="spec.mode === 'room' ? '/duo' : `/ludi/desafio-rapido?modo=${spec.mode}`">{{ labels[spec.mode] }} <span aria-hidden="true">→</span></NuxtLink>
          </div>
        </article>
      </div>
      <div v-else class="ludi-card"><h2>Ainda não temos um jogo para esta combinação.</h2><p>Experimenta mudar o modo, o tempo ou o número de pessoas.</p><button class="ludi-secondary" @click="reset">Limpar filtros</button></div>
      <p v-if="!publicLudi" class="ludi-small" style="margin-top:32px">Procuras os jogos originais? <NuxtLink to="/explore">Explorar o catálogo Doot (legado)</NuxtLink>.</p>
    </div>
  </main>
</template>
