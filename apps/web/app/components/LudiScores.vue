<script setup lang="ts">
import type { LudiView } from '@doot-games/sdk/ludi'
const props = defineProps<{ scores: NonNullable<LudiView['scores']>; me?: string; final?: boolean }>()
const best = computed(() => Math.max(0, ...props.scores.map(p => p.score)))
const tied = computed(() => props.scores.filter(p => p.score === best.value).length > 1)
</script>
<template>
  <section class="ludi-scoreboard" :class="{ 'is-final': final }" aria-label="Pontuação">
    <div class="ludi-score-heading"><h2>{{ final ? 'Como ficou' : 'Pontuação' }}</h2><span v-if="final && scores.length > 1 && tied" class="ludi-small">Empate no topo</span></div>
    <ol class="ludi-scores">
      <li v-for="player in scores" :key="player.id" :class="{ leader: final && player.score === best }">
        <span class="ludi-avatar" aria-hidden="true">{{ [...player.name][0]?.toLocaleUpperCase('pt-PT') }}</span>
        <span class="ludi-score-name">{{ player.name }} <small v-if="player.id === me" class="ludi-you">Tu</small></span>
        <span class="ludi-score-value"><strong>{{ player.score }}</strong><small>{{ player.score === 1 ? 'ponto' : 'pontos' }}</small></span>
      </li>
    </ol>
  </section>
</template>
