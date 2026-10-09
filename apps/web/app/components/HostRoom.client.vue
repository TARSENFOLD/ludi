<script setup lang="ts">
/**
 * Hosts a game on the big screen. Client-only (it opens a CLASP connection):
 * it creates a room, loads the plugin's default composition (publishing a
 * redacted config), provides the room, and renders the game's Host view, the
 * generic block renderer, or the plugin's own override.
 */
import { type RelayValue, type RoomMeta, createClaspRelay } from '@doot-games/engine'
import { provideDootRoom, useDootRoom } from '@doot-games/engine/vue'
import {
  GameHost,
  buildAssignContent,
  buildDeriveContent,
  buildRevealSummary,
  buildTimerFor,
  type FilterTier,
  gameAnswerKeys,
  gameRounds,
  getBlock,
  getPlugin,
  inlineDecks,
  maskDerivedPublish,
  poolRowsFor,
  redactGameConfig,
  resolveComposition,
} from '@doot-games/games'
import { DootLogo, Stage } from '@doot-games/ui'
import { computed, onScopeDispose, provide, reactive, ref, watch } from 'vue'

import type { GameComposition, ScorePlayer } from '@doot-games/sdk'

const props = defineProps<{
  pluginId: string
  /** An explicit composition to host (a saved game); falls back to the draft, then the default deck. */
  config?: GameComposition
  /** Theme to host under; falls back to the global theme selection. */
  themeId?: string
  /** The saved game's id, present only when hosting a stored game (not a template).
   *  Used to record a play (durable historical stat) when the room actually starts. */
  gameId?: string
  /** Ludi spike: the creator also joins as a player on this device. */
  duoName?: string
}>()
const runtime = useRuntimeConfig()

const plugin = getPlugin(props.pluginId)
if (!plugin) throw createError({ statusCode: 404, statusMessage: `Unknown game type: ${props.pluginId}` })
// A definitely-defined alias so the load()/resolveConfig() closures keep the
// narrowing (control-flow narrowing of `plugin` doesn't extend into closures).
const game = plugin

const themeState = useState<string>('doot-theme', () => 'doot')
// A per-tab host identity that survives a reload, so the host resumes the same room
// instead of stranding players on a regenerated code. The context is the game being
// hosted, so opening a DIFFERENT game starts a fresh room (no inherited roster); a
// refresh of THIS game resumes it. See useHostSession.
const sessionContext = props.duoName ? `duo:p:${props.pluginId}` : props.gameId ? `g:${props.gameId}` : `p:${props.pluginId}`
const { room: roomCode, token: hostToken, lobby: savedLobby } = useHostSession({ context: sessionContext })
const relay = createClaspRelay(runtime.public.relayUrl as string, { name: 'doot-host' }, { assets: createEphemeralAssets(roomCode) })
const room = useDootRoom({ relay, room: roomCode, role: 'host', hostToken, nameFilter: playerNameFilter })
// Close the socket (and stop the reconnect supervisor) when this host unmounts.
onScopeDispose(() => relay.close())
provideDootRoom(room)
provide('ludiDuo', !!props.duoName)
// If the engine regenerates the code (a genuine collision on a fresh host), persist the
// settled code so a later reload resumes the right room.
watch(() => room.code.value, (c) => persistHostRoom(sessionContext, c))

// Precedence: an explicit config (a saved game) > the editor draft (if it's for
// this game type) > a fresh pool sample (replayable flagships) > the default deck.
const draft = useGameDraft()
const fromDraft = draft.value && draft.value.pluginId === plugin.manifest.id ? draft.value : null
// Theme precedence: a saved game's theme > the draft's theme (survives a host-tab
// reload via the persisted draft) > the global selection.
const themeId = props.themeId ?? fromDraft?.themeId ?? themeState.value
themeState.value = themeId // adopt it for the whole host shell

// The roster, read lazily at derive/reveal time (it changes as players join).
// Read the runtime's authoritative roster directly rather than the reactive
// snapshot: derive/reveal run synchronously inside host actions, and the Vue
// computed can lag, which would drop author names from a derived round's reveal.
const getPlayers = (): ScorePlayer[] =>
  room.runtime.recentPlayers().map((p) => ({ id: p.id, name: p.name, joinedAtIndex: p.joinedAtIndex }))

// A creator's attached content deck (a saved pool game carries it under the reserved
// `pool` key in config.decks). `inlineDecks` unwraps it to a Deck; a `{ref}` is already
// resolved to inline server-side on the play read, and a dropped/unreadable ref is absent.
const poolDeckInline = game.contentPool ? inlineDecks(props.config?.decks).pool : undefined

// For a pooled flagship, let the host pick the round count from the lobby. True for a
// fresh-hosted flagship, OR a saved game that attaches a creator pool deck (so the
// slider re-samples their deck). Provided to the GameHost lobby. Null otherwise.
const usesPool = (!props.config && !fromDraft && !!game.buildConfig) || (!!poolDeckInline && !!game.buildConfig)
const roundConfig =
  usesPool && game.roundOptions ? reactive({ ...game.roundOptions, value: game.roundOptions.default }) : null
// When a creator pool deck is attached, clamp the slider's ceiling (and starting value) to
// the number of USABLE rows, so the host can't ask for more rounds than there is content.
// buildConfig already clamps internally; this just makes the slider tell the truth. Kept at
// least `min` so the control still renders for a small deck.
if (roundConfig && game.contentPool && poolDeckInline) {
  const available = poolRowsFor(game.contentPool, poolDeckInline).length
  roundConfig.max = Math.max(roundConfig.min, Math.min(roundConfig.max, available))
  roundConfig.value = Math.min(roundConfig.value, roundConfig.max)
}
provide('dootRoundConfig', roundConfig)

// Optional soft player cap, set by the host from the lobby. Changing it republishes
// meta so the join screen can turn away a new player once the room is at the cap.
const playerCap = ref<number | null>(props.duoName ? 2 : null)
provide('dootPlayerCap', playerCap)
watch(playerCap, (cap) => {
  if (room.phase.value === 'lobby') room.host.setPlayerCap(cap)
})
if (props.duoName) watch(() => room.connected.value, (connected) => {
  if (connected && room.phase.value === 'lobby') room.host.setPlayerCap(2)
}, { immediate: true })

// Optional "turn off timers" toggle, set from the lobby. Timers are on by default;
// when off, every round's timer is nulled so nothing auto-locks and the host (or
// the delegated driver) advances each round by hand.
const timersOff = ref(false)
provide('dootTimersOff', timersOff)

// Optional content filter (off / moderate / strict), set from the lobby. Masks the
// flagged words in the derived gallery text before it is published, so the room
// never sees them on the big screen. Read at derive time (lobby-only choice).
const contentFilter = ref<FilterTier>('off')
provide('dootContentFilter', contentFilter)

// Restore the host's lobby choices from a prior load of THIS context BEFORE the
// first load(), so a reload rebuilds the identical config (round count, timers,
// filter) and the engine can resume the running game instead of resetting. Pure
// seeding of the reactive choices; no effect if nothing was persisted.
if (savedLobby) {
  if (roundConfig && typeof savedLobby.roundCount === 'number') {
    roundConfig.value = Math.min(Math.max(savedLobby.roundCount, roundConfig.min), roundConfig.max)
  }
  if (typeof savedLobby.timersOff === 'boolean') timersOff.value = savedLobby.timersOff
  if (savedLobby.contentFilter) contentFilter.value = savedLobby.contentFilter as FilterTier
}

/** Null out every round's timer when the host turned timers off. */
function applyTimers(config: GameComposition): GameComposition {
  if (!timersOff.value) return config
  return {
    ...config,
    rounds: config.rounds.map((r) => ({
      ...r,
      content: { ...(r.content as Record<string, unknown>), timer: null },
    })),
  }
}

function resolveConfig(): GameComposition {
  // A saved game that attaches a creator pool deck: re-run buildConfig over THEIR rows
  // (not the frozen config.rounds), so it stays replayable + honors the round slider.
  if (game.buildConfig && game.contentPool && poolDeckInline) {
    const rows = poolRowsFor(game.contentPool, poolDeckInline)
    return applyTimers(game.buildConfig(roomCode, { rounds: roundConfig?.value, rows }))
  }
  if (props.config) return applyTimers(props.config)
  if (fromDraft?.config) return applyTimers(fromDraft.config)
  if (game.buildConfig)
    return applyTimers(game.buildConfig(roomCode, roundConfig ? { rounds: roundConfig.value } : undefined))
  return applyTimers(game.defaultConfig)
}

function buildLoadedGame() {
  // Expand any deck-backed rounds (draw/bindings/pool) into plain rounds for play.
  // A no-op for games without decks, so existing games are unchanged.
  const config = resolveComposition(game, resolveConfig(), roomCode)
  // A game is safe to RESUME on a host reload only when every answer key is static
  // (derivable from the config). Runtime-derived (two-phase) / hidden-role / share-fed
  // rounds compute their answer key in host memory and never put it on the relay, so a
  // reload can't reconstruct them; those keep the clean lobby reset. See tryResumeMidGame.
  const resumable = config.rounds.every((inst) => {
    const b = getBlock(game, inst.block)
    return !b?.derive && !b?.assignContent && !(inst as { fromShares?: unknown }).fromShares
  })
  const baseDerive = buildDeriveContent(game, config, roomCode, getPlayers, (i) => room.answerKeyFor(i))
  const meta: RoomMeta = {
    pluginId: game.manifest.id,
    pluginVersion: game.manifest.version,
    title: config.title || game.manifest.name,
    themeId,
  }
  return {
    meta,
    config: config as unknown as RelayValue,
    publishConfig: redactGameConfig(game, config) as unknown as RelayValue,
    rounds: gameRounds(game, config),
    resumable,
    // Dynamic deadlines: a derived judge round scales its window to the gallery
    // the room actually has to read (read-time scaling in the vote-family blocks).
    timerFor: buildTimerFor(game, config) as never,
    answerKeys: gameAnswerKeys(game, config) as unknown as Record<number, RelayValue>,
    // Two-phase wiring: derive a round's content from earlier inputs at runtime,
    // and publish a public reveal summary so phones can show personal feedback.
    // The derive output is run through the host's content filter before publish.
    deriveContent: ((index: number, inputsFor: (i: number) => Map<string, unknown>) => {
      const out = baseDerive(index, inputsFor)
      return out ? { ...out, publish: maskDerivedPublish(out.publish, contentFilter.value) } : out
    }) as never,
    assignContent: buildAssignContent(game, config, roomCode, getPlayers, (i) => room.answerKeyFor(i)) as never,
    revealSummary: buildRevealSummary(
      game,
      config,
      getPlayers,
      (i) => room.runtimeContentFor(i),
      (i) => room.answerKeyFor(i),
      // P4B: fold the crowd into the published reveal tally only when the toggle is on,
      // so the big screen + phones match the scored result. Read at reveal time, so the
      // lobby toggle is current.
      (i) => (room.meta.value?.crowdCounts ? (room.audienceVotesFor(i) as Map<string, unknown>) : new Map()),
    ) as never,
  }
}
function load() {
  room.host.loadGame(buildLoadedGame())
}
load()
// "Play again": keep this crowd (no re-scan), wipe the previous game's scores, and
// restart at round 1. nextGame() clears the prior inputs at every round address (so
// no score bleed) but keeps the room + roster. Same room code, same content (the
// pooled sample is seeded by the code). For a fresh group, use "New room" instead.
function playAgain() {
  room.host.nextGame(buildLoadedGame())
}
provide('dootPlayAgain', playAgain)
// Re-sample when the host changes the round count in the lobby (before start only).
if (roundConfig) watch(() => roundConfig.value, () => { if (room.phase.value === 'lobby') load() })
// Re-load with/without timers when the host toggles them (lobby only).
watch(timersOff, () => { if (room.phase.value === 'lobby') load() })

// Record a play once, when a saved game's room first leaves the lobby (the game
// actually started). Best-effort and fire-and-forget: a failed ping never disrupts
// the live room. Templates (no gameId) and re-entering the lobby don't re-count.
let playRecorded = false
if (props.gameId) {
  watch(
    () => room.phase.value,
    (phase) => {
      if (phase !== 'lobby' && !playRecorded) {
        playRecorded = true
        $fetch(`/api/games/${props.gameId}/play`, { method: 'POST' }).catch(() => {})
      }
    },
  )
}

// Persist the host's lobby choices the moment the game leaves the lobby, so a host
// reload mid-game rebuilds the identical config and resumes (see tryResumeMidGame).
watch(
  () => room.phase.value,
  (phase) => {
    if (phase !== 'lobby') {
      persistHostLobby(sessionContext, {
        roundCount: roundConfig?.value,
        timersOff: timersOff.value,
        contentFilter: contentFilter.value,
      })
    }
  },
)

const HostView = plugin.components?.Host ?? GameHost
const playerCount = computed(() => room.players.value.length)
const duoController = ref<{ finish: () => void } | null>(null)
const duoCopied = ref(false)
const duoJoinUrl = computed(() => `${window.location.origin}/play/${room.code.value}?ludi=1`)
const duoRoundTotal = computed(() => (room.config.value as { rounds?: unknown[] } | undefined)?.rounds?.length ?? 0)
const duoLastRound = computed(() => room.round.value.index >= duoRoundTotal.value - 1)
const duoAction = computed(() => {
  if (room.phase.value === 'lobby') return 'Começar partida'
  if (room.phase.value === 'results') return 'Jogar novamente'
  switch (room.round.value.state) {
    case 'ready': return 'Abrir respostas'
    case 'open': return 'Fechar respostas'
    case 'locked': return 'Mostrar resultado'
    case 'reveal': return duoLastRound.value ? 'Ver resultados finais' : 'Próxima ronda'
  }
  return 'Continuar'
})
const duoActionEnabled = computed(() => {
  if (room.phase.value === 'lobby') return playerCount.value >= 2 && room.host.can('start')
  if (room.phase.value === 'results') return true
  const state = room.round.value.state
  return state === 'reveal' || room.host.can(state === 'ready' ? 'open' : state === 'open' ? 'lock' : 'reveal')
})
function duoAdvance() {
  if (!duoActionEnabled.value) return
  if (room.phase.value === 'lobby') return room.host.start()
  if (room.phase.value === 'results') return playAgain()
  switch (room.round.value.state) {
    case 'ready': return room.host.openVoting()
    case 'open': return room.host.lock()
    case 'locked': return room.host.reveal()
    case 'reveal': return duoLastRound.value ? duoController.value?.finish() : room.host.next()
  }
}
async function copyDuoLink() {
  try {
    await navigator.clipboard.writeText(duoJoinUrl.value)
    duoCopied.value = true
    setTimeout(() => { duoCopied.value = false }, 2000)
  } catch { /* the URL remains visible for manual copying */ }
}

// "New room": drop this tab's room and reload for a brand-new code + clean roster, so a
// fresh GROUP joins from scratch. The unambiguous "new session" action — offered in the
// lobby and on the results screen. (To replay with the SAME crowd, use Play again.)
function newRoom() {
  resetHostSession(sessionContext)
  if (typeof window !== 'undefined') window.location.reload()
}
provide('dootNewRoom', newRoom)
// "End game": bail out of a game that's mid-round (e.g. a false start) and start fresh.
// Confirmed, since it abandons the running round for everyone in it.
function endGame() {
  if (
    typeof window !== 'undefined' &&
    !window.confirm('End this game and start a fresh room? Everyone in the current round will be sent to a new lobby.')
  )
    return
  newRoom()
}
</script>

<template>
  <div v-if="duoName" class="duo-room">
    <header class="duo-bar">
      <NuxtLink to="/duo" class="duo-brand">Ludi <span>· Entre Nós</span></NuxtLink>
      <span class="duo-code">Sala <strong>{{ room.code.value }}</strong></span>
    </header>
    <div class="duo-grid" :class="{ 'in-lobby': room.phase.value === 'lobby' }">
      <section class="duo-play" aria-label="A tua área de jogo">
        <PlayerRoom v-if="room.connected.value" :key="`${room.code.value}:${duoName}`" :room="room.code.value" :name="duoName" device-first />
        <p v-else class="duo-wait">A criar sala…</p>
      </section>
      <aside class="duo-control" aria-label="Controlos da partida">
        <div class="duo-panel-head"><span class="duo-kicker">ENTRE NÓS</span><span>{{ playerCount }}/2 pessoas</span></div>
        <h1>Uma sala para vocês.</h1>
        <p class="duo-help">Convida a outra pessoa. Depois, responde no teu ecrã e avança a partida com o botão de controlo.</p>
        <div class="duo-invite">
          <span class="duo-label">Código da sala</span>
          <strong class="duo-big-code">{{ room.code.value }}</strong>
          <a :href="duoJoinUrl" class="duo-link">{{ duoJoinUrl }}</a>
          <button type="button" class="duo-copy" @click="copyDuoLink">{{ duoCopied ? 'Link copiado' : 'Copiar convite' }}</button>
        </div>
        <div class="duo-roster">
          <span class="duo-label">Na sala</span>
          <ul><li v-for="person in room.players.value" :key="person.id">{{ person.name }}</li></ul>
          <p v-if="playerCount < 2">A aguardar outra pessoa…</p>
        </div>
        <p v-if="room.phase.value === 'active'" class="duo-progress">Ronda {{ room.round.value.index + 1 }} de {{ duoRoundTotal }}</p>
        <p v-if="room.phase.value === 'results'" class="duo-progress">Partida concluída 🎉</p>
        <button type="button" class="duo-advance" :disabled="!duoActionEnabled" @click="duoAdvance">{{ duoAction }} <span aria-hidden="true">→</span></button>
        <button v-if="room.phase.value !== 'active'" type="button" class="duo-new" @click="newRoom">Criar outra sala</button>
      </aside>
    </div>
    <GameHost ref="duoController" :plugin="plugin" controller-only />
  </div>
  <Stage v-else>
    <template #bar>
      <NuxtLink to="/" class="home-link" aria-label="Doot home"><DootLogo :size="40" /></NuxtLink>
      <div class="bar-right">
        <span class="chip">{{ playerCount }} {{ playerCount === 1 ? 'player' : 'players' }}</span>
        <span class="chip" :class="room.connected.value ? 'live' : 'dead'">
          {{ room.connected.value ? 'connected' : 'connecting…' }}
        </span>
        <span class="code mono">{{ room.code.value }}</span>
        <button
          v-if="room.phase.value === 'active'"
          type="button"
          class="newroom danger"
          title="End this game and start a fresh room"
          @click="endGame"
        >
          End game
        </button>
        <button v-else type="button" class="newroom" title="Start a fresh room with a new code" @click="newRoom">New room</button>
      </div>
    </template>
    <component :is="HostView" :plugin="plugin" />
  </Stage>
</template>

<style scoped>
.duo-room { --primary: #244d35; --primary-ink: #fff; --ink: #20322b; --ink-soft: #5c6d61; --surface: #fff; --surface-2: #f2f6ed; min-height: 100dvh; background: #f6f4ee; color: var(--ink); }
.duo-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; background: #212f2a; color: white; }
.duo-brand { color: white; font-size: 22px; font-weight: 900; text-decoration: none; }
.duo-brand span { font-size: 12px; font-weight: 600; opacity: .7; }
.duo-code { font-size: 13px; }
.duo-code strong { margin-left: 6px; letter-spacing: .15em; font-size: 18px; }
.duo-grid { display: grid; grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); gap: 20px; align-items: start; max-width: 1020px; margin: auto; padding: 20px; }
.duo-play, .duo-control { min-width: 0; }
.duo-control { border: 1px solid #d5d7cd; border-radius: 20px; background: white; padding: 24px; box-shadow: 0 15px 50px #20322b12; }
.duo-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; font-weight: 800; color: #647569; }
.duo-kicker { letter-spacing: .15em; color: #c56040; }
.duo-control h1 { margin: 18px 0 8px; font-size: clamp(26px, 3vw, 38px); letter-spacing: -.035em; line-height: 1.1; }
.duo-help { margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #56675c; }
.duo-invite { display: grid; gap: 8px; border: 1px solid #d3decf; border-radius: 16px; background: #f3f8f0; padding: 18px; }
.duo-label { font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #627668; }
.duo-big-code { font-size: clamp(36px, 5vw, 58px); letter-spacing: .18em; line-height: 1.1; }
.duo-link { color: #244d35; font-size: 12px; word-break: break-all; }
.duo-copy, .duo-advance { border: 0; border-radius: 12px; padding: 13px 16px; background: #244d35; color: white; font: inherit; font-weight: 800; cursor: pointer; }
.duo-copy { justify-self: start; padding: 10px 14px; font-size: 13px; }
.duo-copy:focus-visible, .duo-advance:focus-visible, .duo-new:focus-visible { outline: 3px solid #e37850; outline-offset: 2px; }
.duo-roster { margin: 20px 0; }
.duo-roster ul { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 10px 0 0; }
.duo-roster li { border-radius: 999px; padding: 7px 12px; background: #ebf3e8; font-size: 13px; font-weight: 800; }
.duo-roster p { font-size: 13px; color: #66746a; }
.duo-progress { font-size: 13px; font-weight: 800; color: #536d5d; }
.duo-advance { width: 100%; display: flex; justify-content: space-between; margin-top: 14px; }
.duo-advance:disabled { opacity: .5; cursor: not-allowed; }
.duo-new { display: block; margin: 14px auto 0; padding: 8px; border: 0; background: none; color: #55685a; font: inherit; font-size: 12px; cursor: pointer; }
.duo-wait { padding: 36px; text-align: center; }
@media (max-width: 800px) { .duo-grid { display: flex; flex-direction: column; padding: 10px; gap: 12px; } .duo-grid.in-lobby .duo-control { order: -1; } .duo-play, .duo-control { width: 100%; } .duo-room { padding-bottom: 64px; } .duo-control { padding: 18px; } .duo-advance { position: fixed; z-index: 10; bottom: 10px; left: 10px; width: calc(100% - 20px); box-shadow: 0 8px 26px #20322b44; } }
.home-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  border-radius: 10px;
}
.home-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}
.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 13px;
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  border-radius: 999px;
  padding: 6px 13px;
}
.chip.live {
  color: var(--c5);
}
.chip.dead {
  color: var(--mute);
}
.code {
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.3em;
  color: var(--primary);
  padding-left: 0.3em;
}
.newroom {
  font-weight: 700;
  font-size: 12px;
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
}
.newroom:hover {
  color: var(--ink);
  border-color: var(--line);
}
.newroom:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.newroom.danger {
  color: var(--danger, #d9534f);
  border-color: color-mix(in srgb, var(--danger, #d9534f) 45%, transparent);
}
.newroom.danger:hover {
  color: #fff;
  background: var(--danger, #d9534f);
  border-color: var(--danger, #d9534f);
}
</style>
