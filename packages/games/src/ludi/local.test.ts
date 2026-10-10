import { describe, it, expect, vi } from "vitest";
import { LocalRuntime } from "./local";
import { discoverGames } from "./catalog";
import { guessRules } from "../blocks/guess/rules";
import { pollRules } from "../blocks/poll/rules";
import type { LudiView, LudiAction } from "@doot-games/games/ludi/contracts";

describe("local contract proof, without Vue or relay", () => {
  for (const count of [1, 2, 6])
    it(`plays five questions with ${count} participant(s), offline, then resets`, async () => {
      const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
      const runtime = new LocalRuntime(
        count === 1 ? "solo" : "same-device",
        Array.from({ length: count }, (_, i) => `Pessoa ${i}`),
        { now: () => 123, random: () => 0.5 },
      );
      let view!: LudiView;
      let sequence = 0;
      const send = async (type: LudiAction["type"], choice?: number) =>
        runtime.send({
          id: `request-${sequence++}`,
          match: view.match,
          round: view.round,
          type,
          ...(choice === undefined ? {} : { choice }),
        });
      runtime.observe((v) => {
        view = v;
      });
      try {
        await send("start");
        for (let round = 0; round < 5; round++) {
          for (let player = 0; player < count; player++) {
            if (count > 1) {
              expect(view.handoff?.name).toBe(`Pessoa ${player}`);
              expect(view.content).toBeUndefined();
              expect(view.ownChoice).toBeUndefined();
              await send("ready");
            }
            expect(view.reveal).toBeUndefined();
            expect(view.content).not.toHaveProperty("correct");
            await send("answer", [1, 2, 0, 1, 2][round]);
          }
          expect(view.reveal?.correctIndex).toBe([1, 2, 0, 1, 2][round]);
          await send(round === 4 ? "finish" : "next");
        }
        expect(view.phase).toBe("results");
        expect(view.scores?.map((p) => p.score)).toEqual(Array(count).fill(5));
        await send("replay");
        expect(view.match).toBe(2);
        expect(view.ownChoice).toBeUndefined();
        expect(view.scores).toBeUndefined();
        expect(view.round).toBe(0);
        expect(network).not.toHaveBeenCalled();
      } finally {
        runtime.disconnect();
        network.mockRestore();
      }
    });
  it("rejects malformed, fractional, negative and out-of-range inputs in both rules", () => {
    for (const rule of [guessRules, pollRules]) {
      const content = rule.defaultContent();
      for (const choice of [null, -1, 0.5, 100, "1"])
        expect(rule.isComplete(content as never, { choice } as never)).toBe(false);
      expect(rule.isComplete(content as never, { choice: 0 })).toBe(true);
    }
  });
  it("filters modes, people, typical time and vibe together", () => {
    expect(
      discoverGames({ mode: "room", players: 2, minutes: 5, vibe: "conversation" }).map(
        (g) => g.id,
      ),
    ).toEqual(["entre-nos"]);
    expect(discoverGames({ mode: "room", players: 3 })).toEqual([]);
    expect(discoverGames({ mode: "same-device", minutes: 5 })).toEqual([]);
    expect(discoverGames({ players: 1 })[0]?.modes.map((m) => m.mode)).toEqual(["solo"]);
    expect(discoverGames({ mode: "same-device", players: 6, minutes: 8 })).toHaveLength(1);
  });
  it("is deterministic with the same environment and actions", async () => {
    const trace = async () => {
      const session = new LocalRuntime("solo", ["Ana"], { now: () => 42, random: () => 0.25 });
      const views: LudiView[] = [];
      session.observe((v) => views.push(v));
      await session.send({ id: "start-000", type: "start", match: 1, round: 0 });
      await session.send({ id: "answer-00", type: "answer", match: 1, round: 0, choice: 1 });
      session.disconnect();
      return views;
    };
    expect(await trace()).toEqual(await trace());
  });
});
