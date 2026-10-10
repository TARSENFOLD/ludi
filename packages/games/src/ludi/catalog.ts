import type { LudiManifest, LudiMode, LudiVibe } from "@doot-games/sdk/ludi";

export const ludiCatalog: LudiManifest[] = [
  {
    id: "entre-nos",
    name: "Entre Nós",
    version: "0.2.0",
    description: "Quatro rondas para descobrir, conversar e rir a dois.",
    modes: [
      {
        mode: "room",
        execution: "remote",
        players: { min: 2, max: 2 },
        duration: { min: 3, typical: 5, max: 10 },
      },
    ],
    vibes: ["conversation", "funny"],
    capabilities: ["score", "hidden-input", "reconnect"],
    access: { tier: "free", guestAccess: "included" },
    contentBundle: { id: "entre-nos-pt", version: "1", delivery: "server" },
  },
  {
    id: "desafio-rapido",
    name: "Desafio rápido",
    version: "0.2.0",
    description: "Cinco perguntas, sem pressa. Joga a solo ou passa o aparelho.",
    modes: [
      {
        mode: "solo",
        execution: "local",
        players: { min: 1, max: 1 },
        duration: { min: 2, typical: 3, max: 6 },
      },
      {
        mode: "same-device",
        execution: "local",
        players: { min: 2, max: 6 },
        duration: { min: 4, typical: 8, max: 15 },
      },
    ],
    vibes: ["thinking", "competitive", "chill"],
    capabilities: ["score", "turn-order"],
    access: { tier: "free", guestAccess: "included" },
    contentBundle: { id: "desafio-rapido-pt", version: "1", delivery: "local" },
  },
];
export interface DiscoveryFilter {
  mode?: LudiMode;
  players?: number;
  minutes?: number;
  vibe?: LudiVibe;
}
export function getLudiManifest(id: string): LudiManifest {
  const game = ludiCatalog.find((game) => game.id === id);
  if (!game) throw new Error("Jogo indisponível.");
  return game;
}
/** Match all constraints against the SAME implemented mode. Duration is an estimate. */
export function discoverGames(filter: DiscoveryFilter) {
  return ludiCatalog.flatMap((game) => {
    if (filter.vibe && !game.vibes.includes(filter.vibe)) return [];
    const modes = game.modes.filter(
      (spec) =>
        (!filter.mode || filter.mode === spec.mode) &&
        (!filter.players ||
          (filter.players >= spec.players.min && filter.players <= spec.players.max)) &&
        (!filter.minutes || spec.duration.typical <= filter.minutes),
    );
    return modes.length ? [{ ...game, modes }] : [];
  });
}
