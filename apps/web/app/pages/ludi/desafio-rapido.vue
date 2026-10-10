<script setup lang="ts">
import { LocalRuntime } from '@doot-games/games/ludi/local'
import '../../assets/ludi.css'
useHead({ title: 'Desafio rápido · Ludi', htmlAttrs: { lang: 'pt-PT' } })
const route = useRoute()
const mode = ref<'solo' | 'same-device'>(route.query.modo === 'same-device' ? 'same-device' : 'solo')
const count = ref(2)
const names = ref(['', '', '', '', '', ''])
const session = shallowRef<LocalRuntime>()
const error = ref('')
function start() {
  error.value = ''
  try { session.value = new LocalRuntime(mode.value, names.value.slice(0, mode.value === 'solo' ? 1 : Number(count.value)).map((n, i) => n.trim() || `Pessoa ${i + 1}`)) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Não foi possível começar.' }
}
</script>
<template>
  <LudiGame v-if="session" :session="session" />
  <main v-else class="ludi-page"><header class="ludi-top"><NuxtLink to="/ludi">Ludi</NuxtLink><span>Desafio rápido</span></header>
    <form class="ludi-card ludi-narrow" @submit.prevent="start"><p class="ludi-eyebrow">Cinco perguntas · sem temporizador</p><h1>Uma pergunta de cada vez.</h1>
      <label for="mode">Como vamos jogar?</label><select id="mode" v-model="mode"><option value="solo">A solo</option><option value="same-device">No mesmo aparelho</option></select>
      <template v-if="mode === 'same-device'"><label for="count">Quantas pessoas?</label><select id="count" v-model="count"><option v-for="n in [2,3,4,5,6]" :key="n" :value="n">{{ n }}</option></select><p>Passa o aparelho a cada pessoa. A solução só aparece depois de todos responderem.</p></template>
      <div v-for="n in (mode === 'solo' ? 1 : Number(count))" :key="n"><label :for="`name-${n}`">{{ mode === 'solo' ? 'O teu nome (opcional)' : `Pessoa ${n}` }}</label><input :id="`name-${n}`" v-model="names[n-1]" :placeholder="`Pessoa ${n}`" maxlength="32" autocomplete="off"></div>
      <p v-if="error" role="alert">{{ error }}</p><button class="ludi-primary">Preparar partida <span aria-hidden="true">→</span></button>
      <p class="ludi-small">Depois de carregar, a partida funciona sem internet. Recarregar a página reinicia o jogo.</p>
    </form>
  </main>
</template>
