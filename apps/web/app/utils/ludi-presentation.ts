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
  if (game.id === "entre-nos")
    return {
      game,
      level: "featured",
      tone: "social",
      tagline: "Duas cabeças. Muitas histórias.",
      art: "entre-nos",
      links: { room: { href: "/duo", label: "Jogar a dois" } },
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
  return { game, level: "standard", tone: "paper", tagline: "Uma nova forma de jogar.", links: {} };
}
