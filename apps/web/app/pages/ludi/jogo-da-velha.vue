<script setup lang="ts">
import { TicTacToeLocalRuntime } from '@doot-games/games/ludi/tic-tac-toe'
import '../../assets/ludi.css'
useHead({ title: 'Jogo da Velha · Ludi', htmlAttrs: { lang: 'pt-PT' } })
const route = useRoute()
const mode = ref<'solo' | 'same-device' | 'room'>(route.query.modo === 'room' ? 'room' : route.query.modo === 'solo' ? 'solo' : 'same-device')
const difficulty = ref<'easy' | 'normal' | 'hard'>('normal')
const names = ref(['', ''])
const session = shallowRef<TicTacToeLocalRuntime>()
const error = ref('')
function start() {
  error.value = ''
  if (mode.value === 'room') return
  try { session.value = new TicTacToeLocalRuntime(mode.value, names.value.slice(0, mode.value === 'solo' ? 1 : 2).map((n,i) => n.trim() || `Pessoa ${i + 1}`), difficulty.value) }
  catch(e) { error.value = e instanceof Error ? e.message : 'Não foi possível começar.' }
}
</script>
<template>
  <LudiGame v-if="session" :session="session" />
  <LudiCreateRoom v-else-if="mode === 'room'" game-id="jogo-da-velha" />
  <main v-else class="ludi-page">
    <LudiHeader context="Jogo da Velha" />
    <form class="ludi-narrow ludi-setup" @submit.prevent="start">
      <LudiGameMark game="jogo-da-velha" />
      <h1>Só mais uma partida?</h1><p class="ludi-lead">Nove casas. Três em linha. Quem começa és tu.</p>
      <label for="mode">Como vamos jogar?</label><select id="mode" v-model="mode"><option value="same-device">No mesmo aparelho</option><option value="solo">Contra o computador</option><option value="room">Online</option></select>
      <template v-if="mode === 'solo'"><label for="difficulty">Dificuldade</label><select id="difficulty" v-model="difficulty"><option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Imbatível</option></select></template>
      <div v-for="n in mode === 'solo' ? 1 : 2" :key="n"><label :for="`name-${n}`">{{ n === 1 ? 'X' : 'O' }} · Nome (opcional)</label><input :id="`name-${n}`" v-model="names[n-1]" :placeholder="`Pessoa ${n}`" maxlength="32"></div>
      <p v-if="error" class="ludi-error" role="alert">{{ error }}</p><button class="ludi-primary">Preparar partida</button>
      <p class="ludi-small"><a href="/ludi/licenses/tic-tac-toe.txt" target="_blank" rel="noopener">IA adaptada de Tic-Tac-Toe · Maximilian Schmidt · MIT</a></p>
      <p class="ludi-small">O placar mantém-se nas revanches. Recarregar a página reinicia a partida local.</p>
    </form>
  </main>
</template>
