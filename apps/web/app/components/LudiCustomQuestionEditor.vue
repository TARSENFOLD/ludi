<script setup lang="ts">
import type { OwnQuestion } from '@doot-games/games/ludi/contracts'
import { ludiActionId } from '../utils/ludi-session'
const props = defineProps<{ initial?: OwnQuestion; busy: boolean; error?: string }>()
const emit = defineEmits<{ save: [question: Omit<OwnQuestion, 'status'> & { status: 'draft' | 'submitted' }]; cancel: [] }>()
const questionId = props.initial?.id ?? ludiActionId()
const prompt = ref(props.initial?.prompt ?? '')
const options = ref(props.initial ? [...props.initial.options] : ['', '', '', ''])
const correctIndex = ref<number | null>(props.initial?.correctIndex ?? null)
const duplicates = computed(() => { const filled = options.value.map(o => o.trim().toLocaleLowerCase('pt')).filter(Boolean); return new Set(filled).size !== filled.length })
const valid = computed(() => !!prompt.value.trim() && options.value.every(o => o.trim()) && new Set(options.value.map(o => o.trim().toLocaleLowerCase('pt'))).size === options.value.length && correctIndex.value !== null)
function remove(i: number) { options.value.splice(i, 1); if (correctIndex.value === i) correctIndex.value = null; else if (correctIndex.value !== null && correctIndex.value > i) correctIndex.value-- }
function save(status: 'draft' | 'submitted') { if (valid.value && !props.busy) emit('save', { id: questionId, prompt: prompt.value, options: [...options.value], correctIndex: correctIndex.value!, status }) }
</script>
<template>
  <form class="ludi-custom-editor" :aria-busy="busy" :aria-describedby="error ? `editor-error-${questionId}` : undefined" @submit.prevent="save('submitted')">
    <h2>{{ initial ? 'Editar a tua pergunta' : 'Cria uma pergunta sobre ti' }}</h2>
    <p class="ludi-small">Os outros vão tentar acertar. Só tu vês esta preparação.</p>
    <label :for="`prompt-${questionId}`">Pergunta</label>
    <textarea :id="`prompt-${questionId}`" v-model="prompt" maxlength="240" rows="3" required :disabled="busy" placeholder="Qual destes programas eu escolheria para um sábado livre?" />
    <fieldset :disabled="busy"><legend>Opções e resposta certa</legend>
      <p class="ludi-small">Torna as opções credíveis. Marca a que corresponde a ti.</p>
      <div v-for="(_, i) in options" :key="i" class="ludi-custom-option">
        <input v-model="correctIndex" type="radio" :name="`correct-${questionId}`" :value="i" :aria-label="`Marcar opção ${i + 1} como resposta certa`">
        <label :for="`option-${questionId}-${i}`" class="sr-only">Opção {{ i + 1 }}</label>
        <input :id="`option-${questionId}-${i}`" v-model="options[i]" :aria-invalid="duplicates" :aria-describedby="duplicates ? `duplicate-${questionId}` : undefined" maxlength="120" required :placeholder="`Opção ${i + 1}`">
        <button v-if="options.length > 2" type="button" class="ludi-text-button" :aria-label="`Remover opção ${i + 1}`" @click="remove(i)">×</button>
      </div>
      <button v-if="options.length < 5" type="button" class="ludi-text-button" @click="options.push('')">Adicionar opção</button>
    </fieldset>
    <p v-if="duplicates" :id="`duplicate-${questionId}`" class="ludi-error" role="alert">As opções precisam de ser diferentes.</p>
    <p v-if="error" :id="`editor-error-${questionId}`" class="ludi-error" role="alert">{{ error }}</p>
    <button class="ludi-primary" :disabled="busy || !valid">{{ busy ? 'A guardar…' : 'Guardar pergunta' }}</button>
    <div class="ludi-inline-actions"><button type="button" class="ludi-text-button" :disabled="busy || !valid" @click="save('draft')">Guardar rascunho</button><button type="button" class="ludi-text-button" :disabled="busy" @click="emit('cancel')">Cancelar</button></div>
  </form>
</template>
