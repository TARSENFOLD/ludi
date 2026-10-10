import { LocalRoundAuthority } from "@doot-games/engine/local";
import {
  requireMode,
  type LudiAction,
  type LudiSession,
  type LudiView,
  type RuleEnvironment,
} from "@doot-games/sdk/ludi";
import { getLudiManifest } from "./catalog";
import { MatchController, defineRounds } from "./controller";
import { desafioRapidoContent } from "./content/desafio-rapido";

export const desafioRapido = {
  manifest: getLudiManifest("desafio-rapido"),
  rounds: defineRounds(
    desafioRapidoContent.map((content) => ({
      kind: "guess",
      content: { ...content, timer: null },
    })),
  ),
};
/** Offline session. Same coordinator and filtered session interface as room play.
 * No storage/network; a page reload intentionally creates a new local Match. */
export class LocalRuntime implements LudiSession {
  private controller: MatchController;
  private listeners = new Set<(view: LudiView) => void>();
  private closed = false;
  constructor(
    mode: "solo" | "same-device",
    names: string[],
    environment: RuleEnvironment = { now: Date.now, random: Math.random },
  ) {
    const spec = requireMode(desafioRapido.manifest, mode);
    if (names.length < spec.players.min || names.length > spec.players.max)
      throw new Error("Número de participantes inválido.");
    this.controller = new MatchController(
      desafioRapido,
      mode,
      new LocalRoundAuthority(desafioRapido.rounds.length),
      "local-0",
      environment,
    );
    names.forEach((name, i) => this.controller.join(`local-${i}`, name));
  }
  private view() {
    return this.controller.playerView(this.controller.localActor());
  }
  observe(listener: (view: LudiView) => void) {
    if (this.closed) throw new Error("Partida terminada.");
    this.listeners.add(listener);
    listener(this.view());
    return () => {
      this.listeners.delete(listener);
    };
  }
  availableActions() {
    return this.closed ? [] : this.view().actions;
  }
  async send(action: LudiAction) {
    if (this.closed) throw new Error("Partida terminada.");
    await this.controller.dispatch(this.controller.localActor(), action);
    if (!this.closed) for (const listener of this.listeners) listener(this.view());
  }
  disconnect() {
    this.closed = true;
    this.listeners.clear();
    this.controller.dispose();
  }
}
