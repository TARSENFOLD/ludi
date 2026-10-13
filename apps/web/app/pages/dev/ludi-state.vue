<script setup lang="ts">
// Visual fixtures only. This route is removed from production by pages:extend.
// Dummy content deliberately differs from both games' real questions.
import type { LudiSession, LudiView } from "@doot-games/games/ludi/contracts";
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
// Spectrum fixtures exercise the actual shared shell at small viewport sizes.
if (route.query.game === 'onda') {
  view.gameId = 'na-mesma-onda'; view.title = 'Na Mesma Onda'; view.totalRounds = 6;
  view.players = Array.from({ length: state === 'lobby-waiting' ? 1 : Number(route.query.players || 2) }, (_, i) => ({ id: `p${i}`, name: ['Alexandra', 'Tomás', 'Inês', 'João', 'Marta', 'Rui'][i]! }));
  delete view.ownChoice;
  const spectrum = { kind: 'spectrum' as const, prompt: 'Um convite para um passeio de última hora', leftLabel: 'Preciso de aviso', rightLabel: 'É só calçar os sapatos' };
  const reveal = { mean: 50, marks: view.players.map((_, i) => i % 2 ? 80 : 20), ...(view.players.length === 2 ? { duoScore: 400 } : {}) };
  if (view.phase === 'active') {
    view.content = spectrum;
    if (view.actions[0]?.type === 'answer') view.actions = [{ type: 'answer', label: 'Confirmar posição', range: { min: 0, max: 100, step: 1 } }];
    if (['confirmed', 'locked', 'reconnecting'].includes(state) || view.roundState === 'reveal') view.ownValue = 20;
    if (view.roundState === 'reveal') view.reveal = reveal;
  }
  if (view.phase === 'results' || view.roundState === 'reveal') view.scores = view.players.map(p => ({ ...p, score: view.phase === 'results' ? 2400 : 800 }));
  if (view.phase === 'results') view.history = [{ ...spectrum, reveal }];
}
// Social fixtures use the actual renderer, with synthetic content only.
if (route.query.game === 'social') {
  view.totalRounds = 10; view.round = 2;
  view.players = Array.from({length:Number(route.query.players || 4)},(_,i)=>({id:`p${i}`,name:['Alexandra','Tomás','Inês','João','Marta','Rui'][i]!}));
  view.content = {kind:'poll',social:true,momentType:'quick-choice',prompt:'Num sábado livre, o que te sabe melhor?',options:['Dormir até mais tarde','Passear sem plano','Estar com amigos','Ficar em casa em paz']};
  view.participation={answered:['p1'],eligible:view.players.map(p=>p.id),ready:[]};
  view.actions=[{type:'answer',label:'Confirmar resposta'},{type:'skip',label:'Passar'}];
  if(state==='story')view.content={kind:'conversation',social:true,momentType:'story',prompt:'Conta uma pequena vitória tua desta semana.'};
  if(state==='confirmed'){view.actions=[];view.ownChoice=1;view.participation.answered.push(actor)}
  if(state==='reveal'){view.roundState='reveal';view.reveal={counts:[1,2,1,0]};view.ownChoice=1;view.actions=[{type:'ready',label:'Continuar'}]}
  if(state==='story-reveal'){view.content={kind:'conversation',social:true,momentType:'story',prompt:'Conta uma pequena vitória tua desta semana.'};view.roundState='reveal';view.reveal={contributions:[{playerId:'p0',name:'Alexandra',text:'Consegui terminar algo que andava a adiar há dias.'},{playerId:'p1',name:'Tomás',oral:true}],skipped:2};view.actions=[{type:'ready',label:'Continuar'}]}
  if(state==='results'){view.phase='results';delete view.content;delete view.scores;view.summary={inTune:3,divided:2,predictions:4,correctPredictions:2,customUsed:0,customAttempts:0,customMatches:0,customRemaining:0,skipped:1};view.actions=[{type:'continue',label:'Mais 5'},{type:'replay',label:'Jogar novamente'}]}
  if(state==='preparation'){view.phase='preparation';view.preparation={step:'context',config:null,progress:[],ownQuestions:[],limit:50};view.actions=[]}
}
const connection: ConnectionState = { state: state === 'ended' ? 'ended' : state === 'reconnecting' ? 'reconnecting' : 'connected', message: state === 'ended' ? 'A sala terminou ou o servidor foi reiniciado. Cria uma nova sala.' : state === 'reconnecting' ? 'A restabelecer a ligação. A tua resposta confirmada continua guardada.' : '' }
const fixture: LudiSession = { observe(listener) { listener(view); return () => {} }, availableActions: () => view.actions, async send() { throw new Error('Erro de teste: não foi possível confirmar. A tua seleção foi preservada. Tenta novamente.') }, disconnect() {} }
</script>
<template><div :data-qa-ready="ready"><LudiGame :session="fixture" :connection="connection" /></div></template>
