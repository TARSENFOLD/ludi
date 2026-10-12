<script setup lang="ts">
import { clearQuestionHistory, seenQuestionIds } from '../utils/ludi-question-history'
const count = ref(0), cleared = ref(false)
onMounted(() => { count.value = seenQuestionIds().length })
function clear() { clearQuestionHistory(); count.value = 0; cleared.value = true }
</script>
<template>
  <details class="ludi-form-details"><summary>Perguntas diferentes a cada encontro</summary>
    <p>Este browser recorda os números das perguntas oficiais durante 30 dias, para reduzir repetições noutras salas. Esses números são partilhados com a sala como preferência. Não guardamos aqui respostas, nomes ou perguntas vossas.</p>
    <p>{{ count }} perguntas recordadas neste browser. Noutro browser, o histórico começa de novo.</p>
    <button type="button" class="ludi-text-button" :disabled="!count" @click="clear">Apagar histórico deste browser</button>
    <p v-if="cleared" role="status">Histórico apagado. Aplica-se às próximas salas.</p>
  </details>
</template>
