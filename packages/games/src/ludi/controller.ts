import type { RoundAuthority } from "@doot-games/engine/local";
import {
  actionEnvelopeSchema, participantNameSchema,
  type LudiManifest, type LudiMode, type Participant, type RuleEnvironment, requireMode,
} from "@doot-games/sdk/ludi";
import type { LudiAction, LudiView, RoundReveal, RoundHistory, SocialSummary } from "./contracts";
import type { LudiRound } from "./rounds";
export { defineRounds } from "./rounds";
export interface GameDefinition {
  manifest: LudiManifest;
  rounds: LudiRound[];
  /** Optional per-room content source; never shared between room instances. */
  nextRounds?: (reason?: 'replay' | 'continue') => LudiRound[];
  canContinue?: () => boolean;
  scoring?: boolean;
  /** Opt-in collective progression. Other games retain their existing controls. */
  collective?: boolean;
  summarize?: (history: RoundHistory[]) => SocialSummary;
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
  private ready = new Set<string>();
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
    initialMatch = 1,
  ) {
    this.createdAt = environment.now();
    this.match = initialMatch;
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
  private roundContext(index: number) { return { players: this.players, inputs: this.authority.inputsFor(index) }; }
  private advanceAction(): LudiView['actions'] {
    return this.authority.state().round.index < this.game.rounds.length - 1
      ? [{ type: 'next', label: 'Próxima ronda' }]
      : [{ type: 'finish', label: this.game.scoring === false ? 'Ver o nosso resumo' : 'Ver pontuação final' }];
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
    if (phase === "results") return (control || this.game.collective) ? [
      ...(this.game.canContinue?.() ? [{ type: 'continue' as const, label: 'Mais 5' }] : []),
      { type: 'replay', label: 'Jogar novamente' },
    ] : [];
    if (this.mode === "same-device" && id !== this.localActor()) return [];
    if (this.handoff) return [{ type: "ready", label: "Estou pronto/a" }];
    const r = this.roundAt(round.index), ctx = this.roundContext(round.index);
    if (round.state === 'open') {
      if (!r.requiresInput(ctx)) return [...(control ? this.advanceAction() : []), ...(r.allowSkip ? [{ type: 'skip' as const, label: 'Passar sem explicar' }] : [])];
      if (r.eligiblePlayers(ctx).includes(id) && !ctx.inputs.has(id)) return [
        r.legalAnswer(ctx), ...(r.allowSkip ? [{ type: 'skip' as const, label: 'Passar sem explicar' }] : []),
      ];
    }
    if (round.state === "locked" && control) return [{ type: "reveal", label: "Ver resultado" }];
    if (round.state === "reveal" && this.game.collective)
      return this.ready.has(id) ? [] : [{ type: 'ready', label: round.index === this.game.rounds.length - 1 ? 'Ver o nosso resumo' : 'Continuar' }];
    if (round.state === "reveal" && control)
      return this.advanceAction();
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
      const validated = this.roundAt(round.index).parseAnswer(raw, this.roundContext(round.index));
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
        if (this.game.collective && this.authority.state().round.state === 'reveal') {
          this.ready.add(id);
          if (this.players.every(p => this.ready.has(p.id))) {
            if (this.authority.state().round.index === this.game.rounds.length - 1) await this.authority.finish(this.scores());
            else { this.authority.next(); this.authority.open(); this.beginRound(); }
          }
        } else this.handoff = false;
        break;
      case 'skip': {
        const index = this.authority.state().round.index;
        if (!this.roundAt(index).requiresInput(this.roundContext(index))) {
          this.authority.submit(index, id, { skip: true });
          await this.advanceConversation();
          break;
        }
        this.submitInput(index, id, { skip: true });
        break;
      }
      case "answer": {
        this.submitInput(this.authority.state().round.index, id, input);
        break;
      }
      case "reveal":
        this.authority.reveal();
        break;
      case "next":
        this.closeConversation();
        this.authority.next();
        this.authority.open();
        this.beginRound();
        break;
      case "finish":
        this.closeConversation();
        await this.authority.finish(this.scores());
        break;
      case 'continue':
      case "replay":
        if (this.game.nextRounds) this.game.rounds = this.game.nextRounds(action.type);
        this.match++;
        this.authority.replay(this.game.rounds.length);
        this.authority.open();
        this.beginRound();
        break;
    }
  }
  private submitInput(index: number, id: string, input: unknown) {
    this.authority.submit(index, id, input);
    if (this.roundAt(index).isComplete(this.roundContext(index))) {
      this.authority.lock();
      if (this.mode !== 'room' || this.game.collective) this.authority.reveal();
    } else if (this.mode === 'same-device') { this.turn++; this.handoff = true; }
  }
  private closeConversation() {
    const { round } = this.authority.state();
    if (round.state === 'open' && !this.roundAt(round.index).requiresInput(this.roundContext(round.index))) {
      this.authority.lock(); this.authority.reveal();
    }
  }
  private async advanceConversation() {
    this.closeConversation();
    if (this.authority.state().round.index < this.game.rounds.length - 1) {
      this.authority.next(); this.authority.open(); this.beginRound();
    } else await this.authority.finish(this.scores());
  }
  private beginRound() {
    this.ready.clear();
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
      capacity: { ...requireMode(this.game.manifest, this.mode).players },
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
      const ctx = this.roundContext(round.index);
      if (this.game.collective) view.participation = {
        answered: this.players.filter(p => ctx.inputs.has(p.id)).map(p => p.id),
        eligible: [...r.eligiblePlayers(ctx)], ready: [...this.ready],
      };
      view.content = r.publicContent(ctx, id);
      view.stage = r.stage(ctx);
      const input = this.authority.inputsFor(round.index).get(id);
      if (input !== undefined) Object.assign(view, r.ownView(input));
      if (round.state === "reveal") {
        view.reveal = this.reveal(round.index);
        if (this.game.scoring !== false) view.scores = this.scores();
      }
    }
    if (phase === "results") {
      if (this.game.scoring !== false) view.scores = this.scores();
      view.history = this.game.rounds.map((r, i) => r.history(this.authority.inputsFor(i)));
      if (this.game.summarize) view.summary = this.game.summarize(view.history);
    }
    return view;
  }
  dispose() {
    this.authority.dispose();
    this.seen.clear();
  }
}
