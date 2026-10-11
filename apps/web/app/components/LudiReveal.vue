<script setup lang="ts">
import type { ChoiceRound, RoundReveal } from "@doot-games/games/ludi/contracts";
import type { LudiMode } from "@doot-games/sdk/ludi";
const props = defineProps<{ content: ChoiceRound; reveal: RoundReveal; ownChoice?: number; mode: LudiMode }>()
const correct = computed(() => props.reveal.correctIndex !== undefined)
const personal = computed(() => props.mode !== 'same-device')
const right = computed(() => props.ownChoice === props.reveal.correctIndex)
const total = computed(() => props.reveal.counts?.reduce((sum, value) => sum + value, 0) || 1)
const together = computed(() => props.reveal.counts?.filter(n => n > 0).length === 1)
</script>
<template>
  <div class="ludi-reveal" :class="{ 'is-correct': correct && personal && right }">
    <template v-if="reveal.targetSkipped"><h2>Passámos esta.</h2><p>A pessoa preferiu passar. A conversa pode seguir, sem explicar.</p></template>
    <template v-else-if="correct && content.social"><h2>{{ reveal.authorName ? `${reveal.authorName} escolheu…` : 'Vamos descobrir.' }}</h2><p class="ludi-correct-answer">{{ reveal.correctLabel }}</p><p v-if="reveal.matches !== undefined">{{ reveal.matches }} {{ reveal.matches === 1 ? 'pessoa acertou' : 'pessoas acertaram' }}.</p><p v-if="ownChoice !== undefined" class="ludi-small">{{ right ? 'Acertaste na escolha.' : `Escolheste ${content.options[ownChoice]}. Há mais para descobrir.` }}</p></template>
    <template v-else-if="correct">
      <div class="ludi-reveal-heading"><span class="ludi-reveal-symbol" aria-hidden="true">{{ personal && right ? '✓' : '↗' }}</span><h2>{{ personal && right ? 'Acertaste!' : 'A resposta certa.' }}</h2><span v-if="personal && right" class="ludi-point-gain">+1 ponto</span></div>
      <p class="ludi-correct-answer">{{ reveal.correctLabel }}</p>
      <p v-if="personal && !right && ownChoice !== undefined" class="ludi-small">Escolheste {{ content.options[ownChoice] }}. A próxima é outra oportunidade.</p>
      <p v-else-if="!personal" class="ludi-small">Um ponto para quem acertou. Vejam a pontuação abaixo.</p>
    </template>
    <template v-else-if="reveal.counts?.every(n => n === 0)"><h2>Passámos esta.</h2><p>Não houve respostas nesta pergunta. A conversa pode seguir.</p></template>
    <template v-else>
      <div class="ludi-reveal-heading"><h2>{{ together ? 'Em sintonia!' : 'Escolhas divididas.' }}</h2></div>
      <p class="ludi-small">{{ together ? 'Desta vez, foram pelo mesmo caminho.' : 'Escolhas diferentes. Já têm assunto para conversar.' }}</p>
      <ul class="ludi-votes" aria-label="Escolhas da ronda">
        <li v-for="(option, i) in content.options" :key="i">
          <div class="ludi-vote-label"><span>{{ option }} <small v-if="ownChoice === i" class="ludi-you">Tu</small></span><strong>{{ reveal.counts?.[i] ?? 0 }}<span class="sr-only"> {{ reveal.counts?.[i] === 1 ? 'pessoa' : 'pessoas' }}</span></strong></div>
          <div class="ludi-vote-track" aria-hidden="true"><span :style="{ width: `${(reveal.counts?.[i] ?? 0) / total * 100}%` }" /></div>
        </li>
      </ul>
    </template>
  </div>
</template>
