import { randomBytes, randomUUID } from "node:crypto";
import {
  RoomRuntime,
  MemoryRelay,
  addr,
  type LoadedGame,
  type RelayValue,
} from "@doot-games/engine/server";
import type { RoundAuthority } from "@doot-games/engine/local";
import type { LudiView } from "@doot-games/games/ludi/contracts";
import type { RuleEnvironment } from "@doot-games/sdk/ludi";
import { MatchController, LudiError, type GameDefinition } from "@doot-games/games/ludi/controller";
import { PreparedRoom, createRoomDefinition } from "@doot-games/games/ludi/server";

export const ROOM_TTL = 8 * 60 * 60 * 1000;
export const IDLE_ROOM_TTL = 30 * 60 * 1000;
const EXPIRED = "A sala terminou ou o servidor foi reiniciado. Cria uma nova sala.";

/** Doot's runtime fits the server unchanged: its relay is injected and private.
 * There are no browser host/player runtimes on the Ludi path. The authenticated
 * controller is the only writer of participant inputs. */
async function createAuthority(
  code: string,
  environment: RuleEnvironment,
  definition: GameDefinition,
): Promise<RoundAuthority> {
  const relay = new MemoryRelay();
  const runtime = new RoomRuntime({
    relay,
    room: code,
    role: "host",
    now: environment.now,
    hostToken: randomUUID(),
  });
  const game: LoadedGame = {
    meta: { pluginId: definition.manifest.id, pluginVersion: "0.2.0", title: definition.manifest.name, themeId: "doot" },
    config: { title: definition.manifest.name },
    publishConfig: { title: definition.manifest.name },
    rounds: definition.rounds.map(() => ({ timer: null })),
  };
  runtime.loadGame(game);
  try {
    await runtime.connect();
  } catch (error) {
    runtime.dispose();
    relay.close();
    throw error;
  }
  return {
    state: () => {
      const { phase, round } = runtime.getSnapshot();
      return { phase, round };
    },
    inputsFor: (i) => runtime.inputsFor(i),
    submit: (i, id, input) => relay.set(addr.input(code, i, id), input as RelayValue),
    start: () => runtime.start(),
    open: () => runtime.openVoting(),
    lock: () => runtime.lock(),
    reveal: () => runtime.reveal(),
    next: () => runtime.next(),
    finish: (results) => runtime.finish(results as RelayValue),
    replay: (count) => { if (count !== undefined) game.rounds = Array.from({ length: count }, () => ({ timer: null })); runtime.nextGame(game); },
    dispose: () => {
      runtime.dispose();
      relay.close();
    },
  };
}
interface RoomEntry {
  controller: MatchController | PreparedRoom;
  members: Map<string, string>;
  expiresAt: number;
  createdByIp: string;
  lastAccess: number;
  listeners: Set<{ token: string; view: (view: LudiView) => void; expired: () => void }>;
  timer: ReturnType<typeof setTimeout>;
}
/** One process, ephemeral execution rooms. Not the future persistent Party store. */
export class LudiRoomService {
  private rooms = new Map<string, RoomEntry>();
  private pending = new Map<string, { token: string; ip: string }>();
  private creations = new Map<string, { gameId: string; experience?: string; name: unknown; result: Promise<string>; code?: string }>();
  private sweepTimer: ReturnType<typeof setInterval>;
  constructor(private environment: RuleEnvironment = { now: Date.now, random: Math.random }) {
    this.sweepTimer = setInterval(() => this.sweep(), 60_000);
    this.sweepTimer.unref?.();
  }
  async create(token: string, name: unknown, requestId: string = randomUUID(), ip = "internal", gameId = "entre-nos", experience?: "social") {
    this.sweep();
    const key = `${token}:${requestId}`;
    const previous = this.creations.get(key);
    if (previous) {
      if (previous.name !== name || previous.gameId !== gameId || previous.experience !== experience)
        throw new LudiError(409, "Identificador já usado noutra criação.");
      return this.view(await previous.result, token);
    }
    const entry: { gameId: string; experience?: string; name: unknown; result: Promise<string>; code?: string } = {
      name, gameId, experience,
      result: this.allocate(token, name, ip, gameId, experience),
    };
    this.creations.set(key, entry);
    try {
      entry.code = await entry.result;
      return this.view(entry.code, token);
    } catch (error) {
      this.creations.delete(key);
      throw error;
    }
  }
  private async allocate(token: string, name: unknown, ip: string, gameId: string, experience?: "social") {
    if (this.rooms.size + this.pending.size >= 250)
      throw new LudiError(503, "As salas estão ocupadas. Tenta novamente mais tarde.");
    if (
      [...this.rooms.values()].filter((r) => r.members.has(token)).length +
        [...this.pending.values()].filter((p) => p.token === token).length >=
      3
    )
      throw new LudiError(429, "Já tens três salas abertas. Retoma uma delas.");
    if (
      [...this.rooms.values()].filter((r) => r.createdByIp === ip).length +
        [...this.pending.values()].filter((p) => p.ip === ip).length >=
      20
    )
      throw new LudiError(429, "Esta rede já tem muitas salas abertas. Retoma uma sala existente.");
    let code: string;
    do {
      code = randomBytes(4).toString("hex").toUpperCase();
    } while (this.rooms.has(code) || this.pending.has(code));
    this.pending.set(code, { token, ip });
    let controller: MatchController | PreparedRoom | undefined;
    try {
      const definition = createRoomDefinition(gameId, this.environment);
      const id = randomUUID();
      if (experience && gameId !== 'entre-nos') throw new LudiError(400, 'Experiência indisponível.');
      controller = experience === 'social' ? new PreparedRoom(id, this.environment, definition => createAuthority(code, this.environment, definition), Number(process.env.LUDI_CUSTOM_QUESTION_LIMIT) || 50) : new MatchController(
        definition,
        "room",
        await createAuthority(code, this.environment, definition),
        id,
        this.environment,
      );
      controller.join(id, name);
      const timer = setTimeout(() => this.expire(code), ROOM_TTL);
      timer.unref?.();
      this.rooms.set(code, {
        controller,
        members: new Map([[token, id]]),
        expiresAt: this.environment.now() + ROOM_TTL,
        lastAccess: this.environment.now(),
        createdByIp: ip,
        listeners: new Set(),
        timer,
      });
      return code;
    } catch (error) {
      controller?.dispose();
      throw error;
    } finally {
      this.pending.delete(code);
    }
  }
  private room(code: string) {
    const room = this.rooms.get(code);
    if (!room || this.shouldExpire(room)) {
      this.expire(code);
      throw new LudiError(410, EXPIRED);
    }
    return room;
  }
  private participant(room: RoomEntry, token: string) {
    const id = room.members.get(token);
    if (!id) throw new LudiError(403, "Entra na sala para jogar.");
    return id;
  }
  view(code: string, token: string): LudiView {
    const room = this.room(code);
    const id = this.participant(room, token);
    room.lastAccess = this.environment.now();
    return {
      ...room.controller.playerView(id),
      code,
      expiresAt: room.expiresAt,
    };
  }
  join(code: string, token: string, name: unknown) {
    const room = this.room(code);
    if (!room.members.has(token)) {
      const id = randomUUID();
      room.controller.join(id, name);
      room.members.set(token, id);
      this.notify(code, room);
    }
    return this.view(code, token);
  }
  async action(code: string, token: string, action: unknown) {
    const room = this.room(code);
    await room.controller.dispatch(this.participant(room, token), action);
    // Expiry can occur while an asynchronous command is completing.
    this.room(code);
    this.notify(code, room);
    return this.view(code, token);
  }
  async prepare(code: string, token: string, action: unknown) {
    const room = this.room(code);
    if (!(room.controller instanceof PreparedRoom)) throw new LudiError(409, 'Esta sala não tem preparação.');
    await room.controller.prepare(this.participant(room, token), action);
    this.room(code); this.notify(code, room); return this.view(code, token);
  }
  subscribe(code: string, token: string, view: (view: LudiView) => void, expired: () => void) {
    const room = this.room(code);
    this.participant(room, token);
    if ([...room.listeners].filter((l) => l.token === token).length >= 3)
      throw new LudiError(429, "Fecha uma das outras páginas desta sala.");
    const listener = { token, view, expired };
    room.listeners.add(listener);
    view(this.view(code, token)); // Fresh filtered snapshot; Last-Event-ID replay is unnecessary.
    return () => {
      room.listeners.delete(listener);
      room.lastAccess = this.environment.now();
    };
  }
  private shouldExpire(room: RoomEntry) {
    const now = this.environment.now();
    return (
      now >= room.expiresAt ||
      (room.listeners.size === 0 &&
        room.controller.phase !== "active" &&
        now - room.lastAccess >= IDLE_ROOM_TTL)
    );
  }
  sweep() {
    for (const [code, room] of this.rooms) if (this.shouldExpire(room)) this.expire(code);
  }
  private notify(code: string, room: RoomEntry) {
    for (const listener of room.listeners) listener.view(this.view(code, listener.token));
  }
  expire(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    this.rooms.delete(code);
    clearTimeout(room.timer);
    for (const [key, creation] of this.creations)
      if (creation.code === code) this.creations.delete(key);
    room.controller.dispose();
    for (const listener of room.listeners) listener.expired();
    room.listeners.clear();
    room.members.clear();
  }
  dispose() {
    clearInterval(this.sweepTimer);
    for (const code of this.rooms.keys()) this.expire(code);
  }
}
export const ludiRooms = new LudiRoomService();
