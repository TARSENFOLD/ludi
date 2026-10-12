import type { LudiManifest, LudiMode } from "@doot-games/sdk/ludi";

export type LudiCardLevel = "featured" | "standard" | "compact";
export interface LudiCatalogEntry {
  game: LudiManifest;
  level: LudiCardLevel;
  tone: "social" | "quiz" | "paper";
  tagline: string;
  art?: "entre-nos" | "desafio-rapido";
  links: Partial<Record<LudiMode, { href: string; label: string }>>;
}
/** Shell presentation only. New games opt into a route; no implicit quiz fallback. */
export function presentLudiGame(game: LudiManifest): LudiCatalogEntry {
  if (game.id === 'jogo-da-velha') return {
    game, level: 'standard', tone: 'paper', tagline: 'Três em linha. Só mais uma?',
    links: {
      solo: { href: '/ludi/jogo-da-velha?modo=solo', label: 'Contra o computador' },
      'same-device': { href: '/ludi/jogo-da-velha?modo=same-device', label: 'No mesmo aparelho' },
      room: { href: '/ludi/jogo-da-velha?modo=room', label: 'Criar sala' },
    },
  };
  if (game.id === "entre-nos")
    return {
      game,
      level: "featured",
      tone: "social",
      tagline: "Há mais para descobrir.",
      art: "entre-nos",
      links: { room: { href: "/ludi/entre-nos", label: "Jogar juntos" } },
    };
  if (game.id === "desafio-rapido")
    return {
      game,
      level: "featured",
      tone: "quiz",
      tagline: "Cinco perguntas. E tu?",
      art: "desafio-rapido",
      links: {
        solo: { href: "/ludi/desafio-rapido?modo=solo", label: "Jogar a solo" },
        "same-device": {
          href: "/ludi/desafio-rapido?modo=same-device",
          label: "Passar o aparelho",
        },
      },
    };
  if (game.id === "na-mesma-onda") return {
    game, level: "standard", tone: "paper", tagline: "Onde se encontram as vossas ideias?",
    links: { room: { href: "/ludi/na-mesma-onda", label: "Criar sala" } },
  };
  return { game, level: "standard", tone: "paper", tagline: "Uma nova forma de jogar.", links: {} };
}
