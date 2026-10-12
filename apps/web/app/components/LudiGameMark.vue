<script setup lang="ts">
defineProps<{ game?: string }>()
</script>
<template>
  <svg v-if="game === 'jogo-da-velha'" class="ludi-game-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M23 5v54M41 5v54M5 23h54M5 41h54M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="6" stroke="currentColor" stroke-width="3"/></svg>
  <svg v-else-if="game === 'entre-nos'" class="ludi-game-mark social" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path d="M9 12h26a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8H22L11 49v-8a8 8 0 0 1-8-8V20a8 8 0 0 1 6-8Z" fill="currentColor" />
    <path d="M47 24h5a9 9 0 0 1 9 9v13a9 9 0 0 1-9 9h-1v7l-10-7H29a9 9 0 0 1-9-9" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
    <circle cx="16" cy="27" r="2.5" fill="#faf9f6" /><circle cx="29" cy="27" r="2.5" fill="#faf9f6" />
  </svg>
  <svg v-else-if="game === 'na-mesma-onda'" class="ludi-game-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 34h52M32 10v44" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    <circle cx="19" cy="34" r="7" fill="currentColor" /><circle cx="45" cy="34" r="7" fill="currentColor" />
  </svg>
  <svg v-else class="ludi-game-mark quiz" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path d="M36 3 10 36h20l-2 25 26-34H34L36 3Z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
  </svg>
</template>
