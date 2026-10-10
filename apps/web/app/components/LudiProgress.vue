<script setup lang="ts">
defineProps<{ round: number; total: number }>()
</script>
<template>
  <div class="ludi-progress" :aria-label="`Ronda ${round + 1} de ${total}`">
    <span>Ronda <strong>{{ round + 1 }}</strong> / {{ total }}</span>
    <div class="ludi-progress-steps" aria-hidden="true"><i v-for="n in total" :key="n" :class="{ done: n <= round, current: n === round + 1 }" /></div>
  </div>
</template>
