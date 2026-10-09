<script setup lang="ts">
import type { StandardResults } from '@doot-games/sdk'
import { computed } from 'vue'

const props = defineProps<{ results: StandardResults; me?: string | null }>()
const board = computed(() => props.results.leaderboard ?? [])
const best = computed(() => board.value[0]?.score ?? 0)
const winners = computed(() => best.value > 0 ? board.value.filter((p) => p.score === best.value) : [])
const headline = computed(() => {
  if (winners.value.length === 1) return `${winners.value[0]?.name} venceu!`
  if (winners.value.length > 1) return 'Empate!'
  return 'Boa partida!'
})
const polls = computed(() => props.results.distributions ?? [])
function isMe(id?: string, name?: string) {
  return !!props.me && (props.me === id || props.me === name)
}
function barWidth(count: number, counts: number[]) {
  const total = counts.reduce((sum, value) => sum + value, 0)
  return `${total ? Math.round((count / total) * 100) : 0}%`
}
</script>

<template>
  <div class="ludi-results">
    <p class="kicker">ENTRE NÓS · FIM DA PARTIDA</p>
    <h1>{{ headline }}</h1>
    <p class="intro">Quatro rondas, duas pessoas e uma conversa para continuar.</p>

    <section v-if="board.length" class="panel" aria-label="Pontuação final">
      <h2>Pontuação final</h2>
      <ol class="scores">
        <li v-for="(person, index) in board" :key="person.id ?? person.name" :class="{ winner: person.score === best && best > 0 }">
          <span class="place">{{ index + 1 }}</span>
          <span class="person">{{ person.name }} <small v-if="isMe(person.id, person.name)">Tu</small></span>
          <strong>{{ person.score }}</strong>
        </li>
      </ol>
    </section>

    <section v-if="polls.length" class="panel" aria-label="Escolhas da partida">
      <h2>As vossas escolhas</h2>
      <div v-for="(poll, index) in polls" :key="index" class="poll">
        <h3>{{ poll.title }}</h3>
        <div v-for="(option, optionIndex) in poll.bars" :key="optionIndex" class="option">
          <div class="option-line"><span>{{ option.label }}</span><strong>{{ option.count }}</strong></div>
          <div class="track"><span :style="{ width: barWidth(option.count, poll.bars.map((bar) => bar.count)) }" /></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ludi-results { display: grid; gap: 16px; padding: 10px 0 26px; color: #20322b; }
.kicker { margin: 0; color: #8d5c46; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
h1 { margin: 0; font-size: clamp(32px, 8vw, 46px); line-height: 1.05; letter-spacing: -.04em; }
.intro { margin: 0 0 4px; color: #5a6c60; line-height: 1.45; }
.panel { border: 2px solid #d7ded3; border-radius: 19px; background: #fff; padding: 18px; }
h2 { margin: 0 0 14px; font-size: 20px; }
.scores { display: grid; gap: 8px; list-style: none; padding: 0; margin: 0; }
.scores li { display: flex; align-items: center; gap: 12px; border: 1px solid #d8dfd5; border-radius: 12px; padding: 10px 12px; }
.scores li.winner { border-color: #e7ba66; background: #fff7dc; }
.place { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; background: #e8efe5; font-weight: 900; }
.person { flex: 1; font-weight: 800; }
.person small { margin-left: 5px; border-radius: 999px; padding: 2px 6px; background: #d6e8d1; font-size: 10px; }
.scores strong { font-size: 24px; color: #244d35; }
.poll + .poll { margin-top: 20px; border-top: 1px solid #e3e9e0; padding-top: 18px; }
h3 { margin: 0 0 12px; font-size: 15px; line-height: 1.35; }
.option + .option { margin-top: 10px; }
.option-line { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.track { height: 7px; margin-top: 5px; border-radius: 99px; background: #e7ece4; overflow: hidden; }
.track span { display: block; height: 100%; border-radius: inherit; background: #e37850; }
</style>
