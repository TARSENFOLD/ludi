import { afterEach, describe, expect, it, vi } from "vitest";
import type { LudiView } from "@doot-games/games/ludi/contracts";
import { RoomSession } from "./ludi-session";

class Events {
  static current: Events;
  handlers = new Map<string, (event: { data: string }) => void>();
  onerror?: () => void;
  onopen?: () => void;
  closed = false;
  readyState = 1;
  constructor() {
    Events.current = this;
  }
  addEventListener(type: string, handler: (event: { data: string }) => void) {
    this.handlers.set(type, handler);
  }
  emit(type: string, value: unknown) {
    this.handlers.get(type)?.({ data: JSON.stringify(value) });
  }
  close() {
    this.closed = true;
  }
}
const initial = (): LudiView => ({
  context: {
    mode: "room",
    execution: "remote",
    surface: "participant",
    locale: "pt-PT",
    participantId: "guest",
    permissions: { control: false },
  },
  gameId: "entre-nos",
  title: "Entre Nós",
  code: "ABCDEFGH",
  revision: 1,
  match: 1,
  phase: "active",
  round: 0,
  totalRounds: 4,
  roundState: "open",
  players: [{ id: "guest", name: "Beto" }],
  actions: [{ type: "answer", label: "Confirmar resposta" }],
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("HTTP + SSE session ordering and lifecycle", () => {
  it("reopens a CLOSED SSE stream with backoff and cancels retries on disconnect", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", Events);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => initial() }),
    );
    const session = new RoomSession(initial(), () => {});
    const old = Events.current;
    old.readyState = 2;
    old.onerror?.();
    await vi.advanceTimersByTimeAsync(1100);
    expect(Events.current).not.toBe(old);
    expect(old.closed).toBe(true);
    const current = Events.current;
    current.readyState = 2;
    current.onerror?.();
    session.disconnect();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(Events.current).toBe(current);
  });
  it("refreshes the view when an intermediary sends a non-JSON error", async () => {
    vi.stubGlobal("EventSource", Events);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: async () => {
            throw new Error("not JSON");
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ...initial(), revision: 2 }),
        }),
    );
    const session = new RoomSession(initial(), () => {});
    let revision = 0;
    session.observe((v) => {
      revision = v.revision;
    });
    await expect(
      session.send({ id: "proxy-error", match: 1, round: 0, type: "answer", choice: 1 }),
    ).rejects.toThrow("Não foi possível enviar");
    expect(revision).toBe(2);
    session.disconnect();
  });
  it("ignores stale HTTP and duplicate SSE snapshots and retries with the same action id", async () => {
    vi.stubGlobal("EventSource", Events);
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("lost response"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...initial(), revision: 2 }) });
    vi.stubGlobal("fetch", request);
    const session = new RoomSession(initial(), () => {});
    const views: LudiView[] = [];
    session.observe((v) => views.push(v));
    Events.current.emit("snapshot", {
      ...initial(),
      revision: 3,
      roundState: "locked",
      ownChoice: 1,
    });
    Events.current.emit("snapshot", { ...initial(), revision: 3 });
    await session.send({ id: "idempotent-action", match: 1, round: 0, type: "answer", choice: 1 });
    expect(views.map((v) => v.revision)).toEqual([1, 3]);
    expect(request.mock.calls[0]?.[1].body).toBe(request.mock.calls[1]?.[1].body);
    session.disconnect();
    expect(Events.current.closed).toBe(true);
    expect(session.availableActions()).toEqual([]);
  });
  it("ends the connection on server expiry and rejects further actions", async () => {
    vi.stubGlobal("EventSource", Events);
    const messages: string[] = [];
    const session = new RoomSession(initial(), (status) => messages.push(status.message));
    Events.current.emit("expired", {});
    expect(Events.current.closed).toBe(true);
    expect(messages.at(-1)).toContain("servidor foi reiniciado");
    await expect(
      session.send({ id: "after-expiry", match: 1, round: 0, type: "answer", choice: 1 }),
    ).rejects.toThrow("ligação terminou");
  });
});
