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
  <main v-else class="ludi-page">
    <LudiHeader context="Desafio rápido" />
    <form class="ludi-narrow ludi-setup" @submit.prevent="start">
      <div class="ludi-form-heading">
        <LudiGameMark game="desafio-rapido" />
        <p class="ludi-eyebrow">Cinco perguntas · sem pressa</p>
        <h1>Vamos a isso?</h1>
        <p class="ludi-lead">Um ponto por acerto. Uma pergunta de cada vez.</p>
      </div>
      <label for="mode">Como vamos jogar?</label><select id="mode" v-model="mode"><option value="solo">A solo</option><option value="same-device">No mesmo aparelho</option></select>
      <template v-if="mode === 'same-device'">
        <label for="count">Quantas pessoas?</label><select id="count" v-model="count"><option v-for="n in [2,3,4,5,6]" :key="n" :value="n">{{ n }}</option></select>
        <p class="ludi-small">O aparelho passa de mão em mão. A solução só aparece depois de todos responderem.</p>
        <details class="ludi-form-details ludi-names"><summary>Dar nome aos jogadores <span class="ludi-small">(opcional)</span></summary>
          <div class="ludi-name-fields"><div v-for="n in Number(count)" :key="n"><label :for="`name-${n}`">Pessoa {{ n }}</label><input :id="`name-${n}`" v-model="names[n-1]" :placeholder="`Pessoa ${n}`" maxlength="32" autocomplete="off"></div></div>
        </details>
      </template>
      <div v-else><label for="name-1">O teu nome <span class="ludi-small">(opcional)</span></label><input id="name-1" v-model="names[0]" placeholder="Pessoa 1" maxlength="32" autocomplete="nickname"></div>
      <p v-if="error" class="ludi-error" role="alert">{{ error }}</p>
      <button class="ludi-primary">Preparar partida <span aria-hidden="true">→</span></button>
      <p class="ludi-small ludi-form-note">Podes jogar sem internet depois de carregar. Recarregar a página começa tudo de novo.</p>
    </form>
  </main>
</template>
