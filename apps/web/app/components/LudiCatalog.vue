<script setup lang="ts">
import type { LudiCatalogEntry } from '../utils/ludi-presentation'
const props = defineProps<{ entries: LudiCatalogEntry[] }>()
// Editorial capacity is bounded; extra featured entries join the regular catalogue.
const featured = computed(() => props.entries.filter(entry => entry.level === 'featured').slice(0, 2))
const standard = computed(() => props.entries.filter(entry => entry.level !== 'compact' && !featured.value.includes(entry)))
const compact = computed(() => props.entries.filter(entry => entry.level === 'compact'))
</script>
<template>
  <div class="ludi-catalog-system">
    <section v-if="featured.length" class="ludi-featured-grid" aria-label="Em destaque">
      <LudiGameCard v-for="entry in featured" :key="entry.game.id" :entry="entry" level="featured" />
    </section>
    <section v-if="standard.length" class="ludi-catalog-section" aria-label="Mais formas de jogar">
      <h2 v-if="featured.length" class="ludi-section-title">Mais formas de jogar.</h2>
      <div class="ludi-standard-grid"><LudiGameCard v-for="entry in standard" :key="entry.game.id" :entry="entry" level="standard" /></div>
    </section>
    <section v-if="compact.length" class="ludi-compact-grid" aria-label="Mais jogos">
      <LudiGameCard v-for="entry in compact" :key="entry.game.id" :entry="entry" level="compact" />
    </section>
  </div>
</template>
