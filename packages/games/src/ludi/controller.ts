import type { RoundAuthority } from "@doot-games/engine/local";
import {
  actionEnvelopeSchema, participantNameSchema,
  type LudiManifest, type LudiMode, type Participant, type RuleEnvironment, requireMode,
} from "@doot-games/sdk/ludi";
import type { LudiAction, LudiView, RoundReveal } from "./contracts";
import type { LudiRound } from "./rounds";
export { defineRounds } from "./rounds";
export interface GameDefinition {
  manifest: LudiManifest;
  rounds: LudiRound[];
  /** Optional per-room content source; never shared between room instances. */
  nextRounds?: () => LudiRound[];
}
export class LudiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Framework/transport-free Match coordinator. Only playerView crosses a session
 * boundary. Roster, all inputs and solutions remain owned by this authority. */
export class MatchController {
  private players: Participant[] = [];
  private revision = 0;
  private match = 1;
  private handoff = false;
  private turn = 0;
  private seen = new Map<string, string>();
  private queue: Promise<void> = Promise.resolve();
  readonly createdAt: number;
  constructor(
    private game: GameDefinition,
    private mode: LudiMode,
    private authority: RoundAuthority,
    private creator: string,
    environment: RuleEnvironment,
  ) {
    this.createdAt = environment.now();
    if (!game.manifest.modes.some((m) => m.mode === mode))
      throw new LudiError(400, "Modo indisponível.");
  }
  join(id: string, rawName: unknown) {
    if (this.players.some((p) => p.id === id)) return;
    const parsed = participantNameSchema.safeParse(rawName);
    if (!parsed.success) throw new LudiError(400, "Usa um nome entre 1 e 32 caracteres.");
    const spec = requireMode(this.game.manifest, this.mode);
    // Synchronous check + insertion: no await between checking the last seat and claiming it.
    if (this.authority.state().phase !== "lobby" || this.players.length >= spec.players.max)
      throw new LudiError(409, "Esta sala já está cheia ou a partida começou.");
    if (
      this.players.some(
        (p) => p.name.toLocaleLowerCase("pt") === parsed.data.toLocaleLowerCase("pt"),
      )
    )
      throw new LudiError(
        409,
        "Esse nome já está em uso. Escolhe outro; o nome não recupera uma sessão.",
      );
    this.players.push({ id, name: parsed.data });
    this.revision++;
  }
  private roundAt(index: number) {
    const round = this.game.rounds[index];
    if (!round) throw new LudiError(409, "Ronda indisponível.");
    return round;
  }
  hasPlayer(id: string) {
    return this.players.some((p) => p.id === id);
  }
  get phase() {
    return this.authority.state().phase;
  }
  localActor() {
    return this.players[this.turn]?.id ?? this.creator;
  }
  private canControl(id: string) {
    return this.mode !== "room" || id === this.creator;
  }
  private legalActions(id: string): LudiView["actions"] {
    const { phase, round } = this.authority.state();
    const control = this.canControl(id);
    if (phase === "lobby") {
      const minimum = requireMode(this.game.manifest, this.mode).players.min;
      return control && this.players.length >= minimum
        ? [{ type: "start", label: "Começar partida" }]
        : [];
    }
    if (phase === "results") return control ? [{ type: "replay", label: "Jogar novamente" }] : [];
    if (this.mode === "same-device" && id !== this.localActor()) return [];
    if (this.handoff) return [{ type: "ready", label: "Estou pronto/a" }];
    if (round.state === "open" && !this.authority.inputsFor(round.index).has(id)) {
      return [this.roundAt(round.index).legalAnswer()];
    }
    if (round.state === "locked" && control) return [{ type: "reveal", label: "Ver resultado" }];
    if (round.state === "reveal" && control)
      return round.index < this.game.rounds.length - 1
        ? [{ type: "next", label: "Próxima ronda" }]
        : [{ type: "finish", label: "Ver pontuação final" }];
    return [];
  }
  /** Validate again at the authority, including optimistic round/match tokens.
   * Queue all commands so concurrent requests cannot pass validation together. */
  dispatch(id: string, raw: unknown): Promise<void> {
    const job = this.queue.then(() => this.applyValidated(id, raw));
    this.queue = job.catch(() => {});
    return job;
  }
  private async applyValidated(id: string, raw: unknown) {
    if (!this.hasPlayer(id)) throw new LudiError(403, "Entra na sala para jogar.");
    const parsed = actionEnvelopeSchema.passthrough().safeParse(raw);
    if (!parsed.success) throw new LudiError(400, "Ação inválida.");
    const action = parsed.data;
    const fingerprint = JSON.stringify(action);
    const key = `${id}:${action.id}`;
    const previous = this.seen.get(key);
    if (previous) {
      if (previous !== fingerprint) throw new LudiError(409, "Identificador já usado noutra ação.");
      return;
    }
    const { round } = this.authority.state();
    if (action.match !== this.match || action.round !== round.index)
      throw new LudiError(409, "A partida avançou. Atualiza a tua visão.");
    if (!this.legalActions(id).some((a) => a.type === action.type))
      throw new LudiError(409, "Esta ação já não está disponível.");
    let input: unknown;
    if (action.type === "answer") {
      const validated = this.roundAt(round.index).parseAnswer(raw);
      if (!validated) throw new LudiError(400, "Resposta inválida.");
      input = validated.input;
    } else if (!actionEnvelopeSchema.strict().safeParse(raw).success) {
      throw new LudiError(400, "Ação inválida.");
    }
    await this.apply(id, action, input);
    this.seen.set(key, fingerprint);
    // Bounded replay cache; old round/match tokens still reject an evicted request.
    if (this.seen.size > 512) this.seen.delete(this.seen.keys().next().value ?? "");
    this.revision++;
  }
  private async apply(id: string, action: LudiAction, input?: unknown) {
    switch (action.type) {
      case "start":
        this.authority.start();
        this.authority.open();
        this.beginRound();
        break;
      case "ready":
        this.handoff = false;
        break;
      case "answer": {
        const index = this.authority.state().round.index;
        this.authority.submit(index, id, input);
        if (this.authority.inputsFor(index).size === this.players.length) {
          this.authority.lock();
          if (this.mode !== "room") this.authority.reveal();
        } else if (this.mode === "same-device") {
          this.turn++;
          this.handoff = true;
        }
        break;
      }
      case "reveal":
        this.authority.reveal();
        break;
      case "next":
        this.authority.next();
        this.authority.open();
        this.beginRound();
        break;
      case "finish":
        await this.authority.finish(this.scores());
        break;
      case "replay":
        if (this.game.nextRounds) this.game.rounds = this.game.nextRounds();
        this.match++;
        this.authority.replay();
        this.authority.open();
        this.beginRound();
        break;
    }
  }
  private beginRound() {
    this.turn = 0;
    this.handoff = this.mode === "same-device";
  }
  private reveal(index: number): RoundReveal {
    return this.roundAt(index).reveal(this.authority.inputsFor(index));
  }
  private scores() {
    const state = this.authority.state();
    const last = state.round.index - (state.phase === "results" || state.round.state === "reveal" ? 0 : 1);
    const totals = new Map(this.players.map(p => [p.id, 0]));
    for (let i = 0; i <= last; i++) {
      for (const [id, score] of this.roundAt(i).scores(this.authority.inputsFor(i), this.players)) {
        if (totals.has(id)) totals.set(id, totals.get(id)! + score);
      }
    }
    return this.players.map(p => ({ ...p, score: totals.get(p.id)! }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt"));
  }
  /** Single allowlist serializer for initial HTTP, command replies, SSE and reconnect.
   * Deliberately never spreads content or authority snapshots into a public object. */
  playerView(id: string): LudiView {
    if (!this.hasPlayer(id)) throw new LudiError(403, "Entra na sala para jogar.");
    const { phase, round } = this.authority.state();
    const r = this.roundAt(round.index);
    const view: LudiView = {
      context: {
        mode: this.mode,
        execution: this.mode === "room" ? "remote" : "local",
        surface: this.canControl(id) ? "primary" : "participant",
        locale: "pt-PT",
        participantId: id,
        permissions: { control: this.canControl(id) },
      },
      gameId: this.game.manifest.id,
      title: this.game.manifest.name,
      revision: this.revision,
      match: this.match,
      phase,
      round: round.index,
      totalRounds: this.game.rounds.length,
      roundState: round.state,
      players: this.players.map((p) => ({ ...p })),
      actions: this.legalActions(id),
    };
    if (this.handoff) view.handoff = { name: this.players[this.turn]?.name ?? "" };
    if (phase === "active" && !this.handoff) {
      view.content = r.publicContent();
      const input = this.authority.inputsFor(round.index).get(id);
      if (input !== undefined) Object.assign(view, r.ownView(input));
      if (round.state === "reveal") {
        view.reveal = this.reveal(round.index);
        view.scores = this.scores();
      }
    }
    if (phase === "results") {
      view.scores = this.scores();
      view.history = this.game.rounds.map((r, i) => r.history(this.authority.inputsFor(i)));
    }
    return view;
  }
  dispose() {
    this.authority.dispose();
    this.seen.clear();
  }
}
