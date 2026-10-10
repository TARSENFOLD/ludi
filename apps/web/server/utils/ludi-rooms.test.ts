import { afterEach, describe, expect, it } from "vitest";
import { LudiRoomService, ROOM_TTL, IDLE_ROOM_TTL } from "./ludi-rooms";
import type { LudiAction, LudiView } from "@doot-games/games/ludi/contracts";

const services: LudiRoomService[] = [];
function service(now = () => 1000) {
  const s = new LudiRoomService({ now, random: () => 0.25 });
  services.push(s);
  return s;
}
afterEach(() => {
  for (const s of services.splice(0)) s.dispose();
});
let seq = 0;
function action(view: LudiView, type: LudiAction["type"], choice?: number): LudiAction {
  return {
    id: `test-action-${seq++}`,
    match: view.match,
    round: view.round,
    type,
    ...(choice === undefined ? {} : { choice }),
  };
}
async function setup() {
  const s = service();
  const creator = await s.create("creator-secret-token", "Ana");
  const code = creator.code ?? "";
  s.join(code, "guest-secret-token", "Beto");
  return {
    s,
    code,
    send: (type: LudiAction["type"], choice?: number, token = "creator-secret-token") =>
      s.action(code, token, action(s.view(code, token), type, choice)),
  };
}
describe("authoritative room with Doot RoomRuntime", () => {
  it("reclaims abandoned lobbies but keeps active matches resumable until the hard TTL", async () => {
    let now = 0;
    const s = service(() => now);
    const lobby = await s.create("lobby", "Ana");
    const playing = await s.create("playing", "Ana");
    const code = playing.code ?? "";
    s.join(code, "guest", "Beto");
    await s.action(code, "playing", action(playing, "start"));
    now = IDLE_ROOM_TTL;
    s.sweep();
    expect(() => s.view(lobby.code ?? "", "lobby")).toThrow("sala terminou");
    expect(s.view(code, "playing").phase).toBe("active");
  });
  it("caps concurrent rooms by IP even when anonymous tokens rotate", async () => {
    const s = service();
    const attempts = await Promise.allSettled(
      Array.from({ length: 21 }, (_, i) => s.create(`token-${i}`, "Ana", `create-${i}`, "one-ip")),
    );
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(20);
    await expect(s.create("another", "Ana", "other-network", "two-ip")).resolves.toHaveProperty(
      "code",
    );
  });
  it("creates idempotently and bounds concurrent creations for an anonymous session", async () => {
    const s = service();
    const [a, b] = await Promise.all([
      s.create("a", "Ana", "same-request"),
      s.create("a", "Ana", "same-request"),
    ]);
    expect(a.code).toBe(b.code);
    await expect(s.create("a", "Beto", "same-request")).rejects.toThrow("Identificador já usado");
    const rooms = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) => s.create("a", "Ana", `request-${i}`)),
    );
    expect(rooms.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  });
  it("runs all four rounds; snapshots, SSE and reloads withhold other inputs and future solutions", async () => {
    const { s, code, send } = await setup();
    const creatorEvents: LudiView[] = [];
    const guestEvents: LudiView[] = [];
    const off = s.subscribe(
      code,
      "creator-secret-token",
      (v) => creatorEvents.push(v),
      () => {},
    );
    s.subscribe(
      code,
      "guest-secret-token",
      (v) => guestEvents.push(v),
      () => {},
    );
    await send("start");
    for (let i = 0; i < 4; i++) {
      const picks = [
        [0, 1],
        [1, 0],
        [2, 0],
        [2, 1],
      ][i];
      await send("answer", picks[0]);
      const resumed = s.view(code, "creator-secret-token");
      expect(resumed.ownChoice).toBe(picks[0]);
      expect(resumed.reveal).toBeUndefined();
      expect(s.view(code, "guest-secret-token").ownChoice).toBeUndefined();
      expect(s.join(code, "creator-secret-token", "Someone else").context.participantId).toBe(
        resumed.context.participantId,
      );
      await send("answer", picks[1], "guest-secret-token");
      expect(s.view(code, "creator-secret-token").roundState).toBe("locked");
      await expect(send("answer", 0)).rejects.toThrow("já não está disponível");
      await send("reveal");
      expect(s.view(code, "guest-secret-token").reveal).toBeDefined();
      await send(i === 3 ? "finish" : "next");
    }
    const final = s.view(code, "creator-secret-token");
    expect(final.scores?.map((p) => p.score)).toEqual([2, 0]);
    expect(final.history).toHaveLength(4);
    for (const event of [...creatorEvents, ...guestEvents]) {
      const payload = JSON.stringify(event);
      expect(payload).not.toMatch(
        /creator-secret-token|guest-secret-token|answerKeys|revealImage|"inputs"|"correct":/,
      );
      if (event.phase !== "results" && event.roundState !== "reveal") {
        expect(payload).not.toMatch(/correctIndex|correctLabel|"counts"/);
        expect(event.scores).toBeUndefined();
      }
    }
    expect(creatorEvents.map((v) => v.revision)).toEqual(
      [...creatorEvents.map((v) => v.revision)].sort((a, b) => a - b),
    );
    off();
    const previousLength = creatorEvents.length;
    await send("replay");
    expect(creatorEvents).toHaveLength(previousLength);
    const fresh = s.view(code, "creator-secret-token");
    expect(fresh.match).toBe(2);
    expect(fresh.round).toBe(0);
    expect(fresh.ownChoice).toBeUndefined();
    expect(fresh.reveal).toBeUndefined();
    expect(fresh.scores).toBeUndefined();
  });
  it("does not use display names as identity; claims the last seat atomically", async () => {
    const s = service();
    const first = await s.create("a", "Ana");
    const code = first.code ?? "";
    expect(() => s.join(code, "evil", "Ana")).toThrow("já está em uso");
    expect(() => s.view(code, first.context.participantId)).toThrow("Entra na sala");
    const results = await Promise.allSettled(
      ["b", "c"].map((token) => Promise.resolve().then(() => s.join(code, token, token))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(s.view(code, "a").players).toHaveLength(2);
  });
  it("validates role, format, phase, round and option; applies duplicate requests once", async () => {
    const { s, code, send } = await setup();
    const original = s.view(code, "creator-secret-token");
    await expect(send("start", undefined, "guest-secret-token")).rejects.toThrow();
    await expect(
      s.action(code, "creator-secret-token", {
        ...action(original, "start"),
        participantId: original.context.participantId,
      }),
    ).rejects.toThrow("Ação inválida");
    await send("start");
    for (const choice of [-1, 0.2, 90]) await expect(send("answer", choice)).rejects.toThrow();
    const request = action(s.view(code, "creator-secret-token"), "answer", 0);
    const [a, b] = await Promise.all([
      s.action(code, "creator-secret-token", request),
      s.action(code, "creator-secret-token", request),
    ]);
    expect(a.revision).toBe(b.revision);
    await expect(s.action(code, "creator-secret-token", { ...request, choice: 1 })).rejects.toThrow(
      "Identificador já usado",
    );
    await send("answer", 1, "guest-secret-token");
    await send("reveal");
    await send("next");
    await expect(
      s.action(code, "creator-secret-token", { ...request, id: "old-round-action" }),
    ).rejects.toThrow("A partida avançou");
    expect((await s.action(code, "creator-secret-token", request)).round).toBe(1);
  });
  it("closes subscriptions and disposes authority on TTL, and reports restart/expiry", async () => {
    let now = 0;
    const s = service(() => now);
    const v = await s.create("a", "Ana");
    let closed = 0;
    s.subscribe(
      v.code ?? "",
      "a",
      () => {},
      () => {
        closed++;
      },
    );
    now = ROOM_TTL;
    expect(() => s.view(v.code ?? "", "a")).toThrow("servidor foi reiniciado");
    expect(closed).toBe(1);
    expect(() => service().view(v.code ?? "", "a")).toThrow("servidor foi reiniciado");
  });
});
