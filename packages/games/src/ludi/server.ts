/** Import only from a server route or a headless test. */
import { getLudiManifest } from "./catalog";
import { defineRounds } from "./controller";
import { entreNosContent } from "./content/entre-nos.server";
export const entreNosDefinition = {
  // Compatibility definition for existing v0.2 clients. New entry requests experience=social.
  manifest: { ...getLudiManifest("entre-nos"), modes: getLudiManifest("entre-nos").modes.map(m => ({ ...m, players: { min: 2, max: 2 } })) },
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
export function createRoomDefinition(id: string, environment: RuleEnvironment): GameDefinition {
  const factory = roomGames.get(id);
  if (!factory) throw new LudiError(400, 'Jogo indisponível.');
  return factory(environment);
}

export { PreparedRoom } from "./prepared-room.server";
