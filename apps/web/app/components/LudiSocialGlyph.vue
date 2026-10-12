<script setup lang="ts">
const props = defineProps<{ label?: string; variant?: number }>()
const motif = computed(() => /casa|paz|descanso|dormir|noite/i.test(props.label ?? '') ? 'moon' : /amig|grupo|pessoa|conhec/i.test(props.label ?? '') ? 'people' : /casal|amor|cuidado|coração/i.test(props.label ?? '') ? 'heart' : /passe|viag|fora|parque|natureza/i.test(props.label ?? '') ? 'tree' : ['spark','sun','speech','tree'][(props.variant ?? 0) % 4])
</script>
<template>
  <svg class="social-glyph" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <template v-if="motif === 'moon'"><circle cx="31" cy="34" r="24" fill="#e4e0f5"/><path d="M38 12a22 22 0 1 0 16 32A23 23 0 0 1 38 12Z" fill="#7770b6"/><path d="m48 8 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#dda74b"/></template>
    <template v-else-if="motif === 'people'"><circle cx="16" cy="23" r="8" fill="#e9aa60"/><circle cx="48" cy="23" r="8" fill="#9dbda5"/><path d="M3 52V42a13 13 0 0 1 26 0v10Z" fill="#e9aa60"/><path d="M35 52V42a13 13 0 0 1 26 0v10Z" fill="#9dbda5"/><circle cx="32" cy="18" r="10" fill="#397b64"/><path d="M17 57V40a15 15 0 0 1 30 0v17Z" fill="#397b64"/></template>
    <template v-else-if="motif === 'heart'"><circle cx="32" cy="32" r="29" fill="#f7e4da"/><path d="M32 50 13 32C-1 16 21 5 32 20 43 5 65 16 51 32Z" fill="#d67558"/></template>
    <template v-else-if="motif === 'tree'"><path d="M5 54C11 35 52 31 61 54v5H5Z" fill="#afd0a7"/><path d="M28 58c-12-10 22-10 12-22" stroke="#f3d894" stroke-width="8"/><path d="M8 36c0-9 5-25 10-25s10 16 10 25Z" fill="#398866"/><path d="M18 27v20" stroke="#24523e" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="15" r="10" fill="#e8b642"/></template>
    <template v-else-if="motif === 'speech'"><path d="M5 29C5 5 54 3 54 27c0 18-24 23-33 18L9 53l3-15Z" fill="#4c9278"/><path d="M31 42c0-17 31-17 31 0 0 7-4 11-7 12l2 6-10-5c-8 1-16-4-16-13Z" fill="#ead9a5"/><path d="M18 26h1m9 0h1m9 0h1" stroke="#fffdf5" stroke-width="5" stroke-linecap="round"/></template>
    <template v-else-if="motif === 'sun'"><circle cx="32" cy="32" r="16" fill="#e8b642"/><path d="M32 3v7m0 44v7M3 32h7m44 0h7M11 11l5 5m32 32 5 5M11 53l5-5m32-32 5-5" stroke="#cd9440" stroke-width="4" stroke-linecap="round"/></template>
    <template v-else><path d="M32 3c2 19 10 27 29 29-19 2-27 10-29 29C30 42 22 34 3 32 22 30 30 22 32 3Z" fill="#78ac90"/><circle cx="32" cy="32" r="8" fill="#f2d69c"/></template>
  </svg>
</template>
<style scoped>.social-glyph{width:3.3rem;height:3.3rem;flex:none}</style>
