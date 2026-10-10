<script setup lang="ts">
defineProps<{ context?: string }>()
</script>
<template>
  <header class="ludi-top">
    <NuxtLink class="ludi-brand" to="/ludi" aria-label="Ludi — escolher um jogo">ludi<span class="ludi-brand-dot" aria-hidden="true" /></NuxtLink>
    <span v-if="context" class="ludi-top-context">{{ context }}</span>
    <slot />
  </header>
</template>
