import {
  type RelayCallback,
  type RelayClient,
  type RelayValue,
  type Unsubscribe,
  RoomRuntime,
  addr,
} from '@doot-games/engine'
import type { GameComposition, ScorePlayer } from '@doot-games/sdk'
import { describe, expect, it } from 'vitest'
import { entreNos } from '../games/entre-nos'
import { buildRevealSummary, gameAnswerKeys, gameRounds, redactGameConfig, scoreGame } from './derive'

class Hub {
  values = new Map<string, RelayValue>()
  listeners = new Set<{ pattern: string; callback: RelayCallback }>()

  deliver(address: string, value: RelayValue) {
    for (const { pattern, callback } of this.listeners) {
      const parts = pattern.split('/')
      const target = address.split('/')
      if (parts.length === target.length && parts.every((part, index) => part === '*' || part === target[index])) {
        callback(value, address)
      }
    }
  }
}

class MemoryRelay implements RelayClient {
  connected = false
  private onConnected: Array<() => void> = []
  constructor(private hub: Hub) {}
  async connect() { this.connected = true; for (const callback of this.onConnected) callback() }
  on(pattern: string, callback: RelayCallback): Unsubscribe {
    const entry = { pattern, callback }
    this.hub.listeners.add(entry)
    for (const [address, value] of this.hub.values) {
      const parts = pattern.split('/')
      const target = address.split('/')
      if (parts.length === target.length && parts.every((part, index) => part === '*' || part === target[index])) callback(value, address)
    }
    return () => this.hub.listeners.delete(entry)
  }
  set(address: string, value: RelayValue) { this.hub.values.set(address, value); this.hub.deliver(address, value) }
  emit(address: string, value: RelayValue = 1) { this.hub.deliver(address, value) }
  cached(address: string) { return this.hub.values.get(address) }
  async get(address: string) { return this.hub.values.get(address) as RelayValue }
  onConnect(callback: () => void) { this.onConnected.push(callback) }
  onDisconnect() {}
  onReconnect() {}
  onError() {}
  close() {}
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('Ludi duo room', () => {
  it('plays all rounds with the creator as a player and withholds quiz answers until reveal', async () => {
    const hub = new Hub()
    const code = 'ABCD'
    const now = () => 0
    const config = entreNos.defaultConfig as GameComposition
    const host = new RoomRuntime({ relay: new MemoryRelay(hub), room: code, role: 'host', now })
    const creator = new RoomRuntime({ relay: new MemoryRelay(hub), room: code, role: 'player', name: 'Ana', now })
    const guest = new RoomRuntime({ relay: new MemoryRelay(hub), room: code, role: 'player', name: 'Beto', now })

    try {
      const players = (): ScorePlayer[] => host.recentPlayers().map((p) => ({
        id: p.id, name: p.name, joinedAtIndex: p.joinedAtIndex,
      }))
      host.loadGame({
        meta: { pluginId: entreNos.manifest.id, pluginVersion: entreNos.manifest.version, title: config.title, themeId: 'doot' },
        config: config as unknown as RelayValue,
        publishConfig: redactGameConfig(entreNos, config) as unknown as RelayValue,
        rounds: gameRounds(entreNos, config),
        answerKeys: gameAnswerKeys(entreNos, config) as unknown as Record<number, RelayValue>,
        revealSummary: buildRevealSummary(
          entreNos, config, players, (index) => host.runtimeContentFor(index), (index) => host.answerKeyFor(index),
        ) as never,
      })
      await host.connect()
      await creator.connect()
      await guest.connect()
      await flush()

      expect(host.recentPlayers().map((p) => p.name).sort()).toEqual(['Ana', 'Beto'])
      host.start()
      const published = hub.values.get(addr.config(code)) as GameComposition
      expect((published.rounds[1]?.content as { correct: number }).correct).toBe(-1)
      expect((published.rounds[3]?.content as { correct: number }).correct).toBe(-1)
      expect(hub.values.get(addr.roundAnswer(code, 1))).toBeUndefined()

      const picks = [[0, 1], [1, 1], [2, 0], [2, 1]]
      for (const [index, [ana, beto]] of picks.entries()) {
        host.openVoting()
        creator.submit({ choice: ana } as RelayValue)
        guest.submit({ choice: beto } as RelayValue)
        await flush()
        expect(host.inputsFor(index).size).toBe(2)
        if (index === 1 || index === 3) expect(hub.values.get(addr.roundAnswer(code, index))).toBeUndefined()
        host.lock()
        host.reveal()
        await flush()
        expect(creator.roundRevealFor(index)).toBeDefined()
        expect(guest.roundRevealFor(index)).toBeDefined()
        if (index === 1 || index === 3) expect(hub.values.get(addr.roundAnswer(code, index))).toBeDefined()
        if (index < picks.length - 1) host.next()
      }

      const answerKeys: Record<number, unknown> = {}
      for (let index = 0; index < config.rounds.length; index++) answerKeys[index] = host.answerKeyFor(index)
      const results = scoreGame(entreNos, config, {
        inputsFor: (index) => host.inputsFor(index),
        players: players(),
        answerKeys,
      })
      host.finish(results as unknown as RelayValue)
      await flush()
      expect(creator.getSnapshot().phase).toBe('results')
      expect(guest.getSnapshot().phase).toBe('results')
      expect(results.leaderboard?.map((entry) => entry.score)).toEqual([2, 1])
    } finally {
      guest.dispose()
      creator.dispose()
      host.dispose()
    }
  })
})
