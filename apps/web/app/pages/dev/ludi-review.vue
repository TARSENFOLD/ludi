<script setup lang="ts">
// Development-only frame: real CSS viewport sizes when the browser's resize API is unavailable.
const route = useRoute()
const width = computed(() => Math.max(320, Math.min(1440, Number(route.query.width) || 390)))
const height = computed(() => Math.max(320, Math.min(1000, Number(route.query.height) || 844)))
const source = computed(() => {
  const path = String(route.query.screen || '/ludi')
  return /^\/(ludi|duo|dev\/ludi-(?:state|catalog))([/?]|$)/.test(path) ? path : '/ludi'
})
</script>
<template>
  <div class="review-frame">
    <p>Viewport de QA · {{ width }} × {{ height }} · {{ source }}</p>
    <iframe title="Ludi — viewport de teste" :src="source" :width="width" :height="height" />
  </div>
</template>
<style scoped>
.review-frame { padding: 12px; background: #d5d5d5; min-height: 100vh; color: #222; }
.review-frame p { margin: 0 0 12px; font: 13px system-ui; }
iframe { display: block; border: 0; background: #faf9f6; }
</style>
