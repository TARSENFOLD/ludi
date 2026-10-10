<script setup lang="ts">
// Visual fixtures only. This route is removed from production by pages:extend.
// Dummy content deliberately differs from both games' real questions.
import type { LudiSession, LudiView } from '@doot-games/sdk/ludi'
import type { ConnectionState } from '../../utils/ludi-session'
import '../../assets/ludi.css'
const ready = ref(false)
onMounted(() => { ready.value = true })
const route = useRoute()
const state = String(route.query.state || 'answer')
const shared = route.query.mode === 'same-device'
const room = !shared && route.query.mode !== 'solo'
const guest = route.query.guest === '1'
const players = Array.from({ length: shared ? Number(route.query.players || 6) : room ? (state === 'lobby-waiting' ? 1 : 2) : 1 }, (_, i) => ({ id: `p${i}`, name: i === 0 ? 'Alexandra Maria de Albuquerque' : ['Tomás', 'Inês', 'João', 'Marta', 'Rui'][i - 1] || 'Pessoa' }))
const actor = guest ? 'p1' : 'p0'
const content = { kind: (state.startsWith('poll') ? 'poll' : 'guess') as 'poll' | 'guess', prompt: 'Para esta ronda de teste, qual destas opções vais escolher?', options: ['Uma resposta curta', 'Uma resposta mais longa para verificar a leitura no ecrã pequeno', 'Outra possibilidade'] }
const view: LudiView = {
  context: { mode: shared ? 'same-device' : room ? 'room' : 'solo', execution: room ? 'remote' : 'local', surface: guest ? 'participant' : 'primary', locale: 'pt-PT', participantId: actor, permissions: { control: !guest } },
  gameId: room ? 'entre-nos' : 'desafio-rapido', title: room ? 'Entre Nós' : 'Desafio rápido',
  ...(room ? { code: 'TEST0001' } : {}), revision: 1, match: 1,
  phase: state.startsWith('lobby') ? 'lobby' : state === 'results' ? 'results' : 'active', round: 1, totalRounds: room ? 4 : 5,
  roundState: state === 'locked' ? 'locked' : state.includes('reveal') || state.startsWith('poll') ? 'reveal' : 'open',
  players, actions: [],
}
if (view.phase === 'lobby') view.actions = !guest && players.length > 1 ? [{ type: 'start', label: 'Começar partida' }] : []
else if (state === 'handoff') { view.handoff = { name: players[0]!.name }; view.actions = [{ type: 'ready', label: 'Estou pronto/a' }] }
else if (state === 'results') {
  view.scores = players.map((p, i) => ({ ...p, score: i % 2 ? 3 : 4 }))
  view.history = [{ prompt: 'Uma escolha de teste', options: ['Opção A', 'Opção B'], reveal: { counts: [1, 1] } }, { prompt: content.prompt, options: content.options, reveal: { correctIndex: 1, correctLabel: content.options[1] } }]
  if (!guest) view.actions = [{ type: 'replay', label: 'Jogar novamente' }]
} else {
  view.content = content
  if (['confirmed', 'locked'].includes(state)) { view.ownChoice = 1; if (state === 'locked' && !guest) view.actions = [{ type: 'reveal', label: 'Ver resultado' }] }
  else if (view.roundState === 'reveal') {
    view.ownChoice = state === 'reveal-wrong' ? 0 : 1
    view.reveal = content.kind === 'poll' ? { counts: [1, 1, 0] } : { correctIndex: 1, correctLabel: content.options[1] }
    view.scores = players.map((p, i) => ({ ...p, score: i % 2 }))
    if (!guest) view.actions = [{ type: 'next', label: 'Próxima ronda' }]
  } else view.actions = [{ type: 'answer', label: 'Confirmar resposta' }]
}
const connection: ConnectionState = { state: state === 'ended' ? 'ended' : state === 'reconnecting' ? 'reconnecting' : 'connected', message: state === 'ended' ? 'A sala terminou ou o servidor foi reiniciado. Cria uma nova sala.' : state === 'reconnecting' ? 'A restabelecer a ligação. A tua resposta confirmada continua guardada.' : '' }
const fixture: LudiSession = { observe(listener) { listener(view); return () => {} }, availableActions: () => view.actions, async send() { throw new Error('Erro de teste: não foi possível confirmar. A tua seleção foi preservada. Tenta novamente.') }, disconnect() {} }
</script>
<template><div :data-qa-ready="ready"><LudiGame :session="fixture" :connection="connection" /></div></template>
