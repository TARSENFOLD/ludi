<script setup lang="ts">
import { SpectrumDial } from '@doot-games/ui'
import type { SpectrumRound, RoundReveal } from '@doot-games/games/ludi/contracts'
defineProps<{ content: SpectrumRound; value?: number; ownValue?: number; reveal?: RoundReveal; disabled?: boolean }>()
const emit = defineEmits<{ 'update:value': [value: number] }>()
const number = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
</script>
<template>
  <section class="ludi-spectrum" :aria-label="reveal ? 'Resultado na escala' : 'Escolhe a tua posição'">
    <SpectrumDial
      :model-value="value ?? 50" :left-label="content.leftLabel" :right-label="content.rightLabel"
      :readonly="!!reveal" :disabled="disabled" :marks="reveal?.marks" :mean="reveal?.mean" :mine="ownValue"
      :labels="{ place: 'Escolhe uma posição entre', unset: 'Move para escolher', of: 'de', hint: 'Move para escolher', results: 'Resultado entre', consensus: 'Média' }"
      @update:model-value="emit('update:value', $event)"
    />
    <template v-if="reveal">
      <p class="ludi-scale-value">Média do grupo <strong>{{ number(reveal.mean ?? 0) }}</strong><span>de 100</span></p>
      <p v-if="ownValue !== undefined">A tua posição: <strong>{{ ownValue }}</strong></p>
      <p class="ludi-small">Posições do grupo: {{ reveal.marks?.map(number).join(' · ') }}.</p>
      <p class="ludi-small">Não há resposta certa. O interessante é onde se encontram.</p>
    </template>
    <template v-else>
      <p class="ludi-scale-value" aria-live="polite">A tua posição <strong>{{ value ?? 50 }}</strong><span>de 100</span></p>
      <p class="ludi-small">Move a escala ou confirma o meio. A tua posição fica privada até à revelação.</p>
    </template>
  </section>
</template>
<style scoped>
.ludi-spectrum { padding: var(--l-space-4, 24px) 8px; }
.ludi-spectrum :deep(.dial-range) { height: 48px; accent-color: var(--l-ink, #203a30); touch-action: pan-y; }
.ludi-spectrum :deep(.poles) { font-size: 1rem; color: inherit; margin-bottom: 16px; }
.ludi-spectrum :deep(.track) { margin: 16px 0; background: #e7ebdd; border: 1px solid #acb7a5; }
.ludi-spectrum :deep(.mean), .ludi-spectrum :deep(.mark.mine) { background: #a13e25; }
.ludi-spectrum :deep(.mean-flag) { color: #a13e25; }
.ludi-scale-value { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin: 24px 0 12px; }
.ludi-scale-value strong { font-size: 2.5rem; font-variant-numeric: tabular-nums; }
.ludi-scale-value span { font-size: .875rem; }
@media (prefers-reduced-motion: reduce) { .ludi-spectrum :deep(.mark) { transition: none; } }
</style>
