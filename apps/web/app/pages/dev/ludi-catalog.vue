<script setup lang="ts">
import { ludiCatalog } from '@doot-games/games/ludi'
import type { LudiCatalogEntry } from '../../utils/ludi-presentation'
import { presentLudiGame } from '../../utils/ludi-presentation'
import '../../assets/ludi.css'
import '../../assets/ludi-editorial.css'
useHead({ title: 'QA · Catálogo Ludi', link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght,SOFT,WONK@0,700,30,1;1,700,30,1&display=swap' }] })
const route = useRoute()
const count = computed(() => Math.max(2, Math.min(12, Number(route.query.count) || 12)))
const entries = computed<LudiCatalogEntry[]>(() => Array.from({ length: count.value }, (_, i) => {
  const source = ludiCatalog[i % ludiCatalog.length]!
  const entry = presentLudiGame(source)
  if (i < 2) return entry
  return { ...entry, game: { ...source, id: `fixture-${i}`, name: i === 4 ? 'Um nome de jogo bastante mais comprido' : `Experiência de teste ${i + 1}` }, level: i >= 8 ? 'compact' : 'standard', art: i % 2 ? undefined : entry.art, tone: i % 2 ? 'paper' : entry.tone, links: i % 2 ? {} : entry.links }
}))
const ready = ref(false)
onMounted(() => { ready.value = true })
</script>
<template><main class="ludi-page ludi-editorial" :data-qa-ready="ready"><LudiHeader context="Fixtures de catálogo — não são novos jogos" /><div class="ludi-main"><p>QA · {{ count }} entradas</p><LudiCatalog :entries="entries" /></div></main></template>
