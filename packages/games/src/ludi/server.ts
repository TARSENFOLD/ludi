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
