/** Import only from a server route or a headless test. */
import { getLudiManifest } from "./catalog";
import { defineRounds } from "./controller";
import { entreNosContent } from "./content/entre-nos.server";
export const entreNosDefinition = {
  manifest: getLudiManifest("entre-nos"),
  rounds: defineRounds(
    entreNosContent.map((r) => ({ kind: r.block as "poll" | "guess", content: r.content })),
  ),
};

import type { RuleEnvironment } from '@doot-games/sdk/ludi';
import { LudiError, type GameDefinition } from './controller';
import { createOndaDefinition } from './onda.server';
/** Explicit server allowlist. Values are factory functions, never client-chosen module paths. */
const roomGames = new Map<string, (env: RuleEnvironment) => GameDefinition>([
  ['entre-nos', () => ({ ...entreNosDefinition, rounds: [...entreNosDefinition.rounds] })],
  ['na-mesma-onda', createOndaDefinition],
]);
export function createRoomDefinition(id: string, environment: RuleEnvironment, allowPreview = false): GameDefinition {
  const factory = roomGames.get(id);
  if (!factory || (id === 'na-mesma-onda' && !allowPreview)) throw new LudiError(400, 'Jogo indisponível.');
  return factory(environment);
}
