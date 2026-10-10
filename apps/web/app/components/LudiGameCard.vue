<script setup lang="ts">
import type { LudiCardLevel, LudiCatalogEntry } from '../utils/ludi-presentation'
const props = defineProps<{ entry: LudiCatalogEntry; level?: LudiCardLevel }>()
const cardLevel = computed(() => props.level ?? props.entry.level)
const vibeLabels: Record<string, string> = { conversation: 'Conversa', funny: 'Para rir', thinking: 'Para pensar', competitive: 'Desafio', chill: 'Sem pressa' }
const actions = computed(() => props.entry.game.modes.flatMap(spec => {
  const link = props.entry.links[spec.mode]
  return link ? [{ spec, ...link }] : []
}))
</script>
<template>
  <article class="ludi-game-tile" :class="[`is-${entry.tone}`, `card-${cardLevel}`]">
    <div class="ludi-tile-top"><span class="ludi-edition">{{ vibeLabels[entry.game.vibes[0] ?? ''] ?? 'Jogar' }}</span><span class="ludi-cover-sign" aria-hidden="true">✳</span></div>
    <div class="ludi-cover-copy"><p class="ludi-eyebrow">{{ entry.tagline }}</p><h2>{{ entry.game.name }}</h2></div>
    <LudiCoverArt v-if="entry.art" :game="entry.art" />
    <div v-else class="ludi-art-fallback" aria-hidden="true"><span>✳</span><span>↗</span><span>✳</span></div>
    <p class="ludi-tile-description">{{ entry.game.description }}</p>
    <div class="ludi-tile-actions">
      <NuxtLink v-for="action in actions" :key="action.spec.mode" class="ludi-game-link" :to="action.href">
        <span><strong>{{ action.label }}</strong><small>{{ action.spec.players.min === action.spec.players.max ? action.spec.players.min : `${action.spec.players.min}–${action.spec.players.max}` }} {{ action.spec.players.max === 1 ? 'pessoa' : 'pessoas' }} · cerca de {{ action.spec.duration.typical }} min</small></span>
        <span class="ludi-link-arrow" aria-hidden="true">↗</span>
      </NuxtLink>
      <p v-if="!actions.length" class="ludi-small">Ainda sem partida disponível.</p>
    </div>
  </article>
</template>
