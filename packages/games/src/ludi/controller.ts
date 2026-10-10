import type { RoundAuthority } from "@doot-games/engine/local";
import {
  actionSchema,
  participantNameSchema,
  validChoice,
  type LudiAction,
  type LudiManifest,
  type LudiMode,
  type LudiView,
  type Participant,
  type RoundReveal,
  type RuleEnvironment,
  requireMode,
} from "@doot-games/sdk/ludi";
import { guessContentSchema, guessRules, type GuessContent } from "../blocks/guess/rules";
import { pollContentSchema, pollRules, type PollContent } from "../blocks/poll/rules";

export type LudiRound =
  | { kind: "poll"; content: PollContent }
  | { kind: "guess"; content: GuessContent };
export interface GameDefinition {
  manifest: LudiManifest;
  rounds: LudiRound[];
}
export class LudiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function defineRounds(
  rounds: Array<{ kind: "poll" | "guess"; content: unknown }>,
): LudiRound[] {
  return rounds.map((r) =>
    r.kind === "poll"
      ? { kind: "poll", content: pollContentSchema.parse(r.content) }
      : { kind: "guess", content: guessContentSchema.parse(r.content) },
  );
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
      return [
        {
          type: "answer",
          label: "Confirmar resposta",
          choices: this.roundAt(round.index).content.options.map((_, i) => i),
        },
      ];
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
    const parsed = actionSchema.safeParse(raw);
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
    if (action.type !== "answer" && action.choice !== undefined)
      throw new LudiError(400, "Ação inválida.");
    if (
      action.type === "answer" &&
      !validChoice(this.roundAt(round.index).content, { choice: action.choice })
    )
      throw new LudiError(400, "Escolha inválida.");
    await this.apply(id, action);
    this.seen.set(key, fingerprint);
    // Bounded replay cache; old round/match tokens still reject an evicted request.
    if (this.seen.size > 512) this.seen.delete(this.seen.keys().next().value ?? "");
    this.revision++;
  }
  private async apply(id: string, action: LudiAction) {
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
        this.authority.submit(index, id, { choice: action.choice ?? -1 });
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
    const r = this.roundAt(index);
    if (r.kind === "guess") {
      const answer = guessRules.answerOf(r.content);
      const summary = guessRules.revealSummary({
        content: r.content,
        inputs: this.authority.inputsFor(index) as Map<string, { choice: number }>,
        answer,
        players: this.players.map((p) => ({ ...p, joinedAtIndex: 0 })),
      }) as RoundReveal;
      return { correctIndex: summary.correctIndex, correctLabel: summary.correctLabel };
    }
    const summary = pollRules.revealSummary({
      content: r.content,
      inputs: this.authority.inputsFor(index) as Map<string, { choice: number }>,
      answer: undefined,
      players: this.players.map((p) => ({ ...p, joinedAtIndex: 0 })),
    }) as { counts: number[] };
    return { counts: summary.counts };
  }
  private scores() {
    const state = this.authority.state();
    const last =
      state.round.index - (state.phase === "results" || state.round.state === "reveal" ? 0 : 1);
    const rounds = this.game.rounds.flatMap((r, index) =>
      r.kind === "guess" && index <= last ? [{ index, content: r.content }] : [],
    );
    const scores = guessRules.aggregate({
      rounds,
      players: this.players.map((p) => ({ ...p, joinedAtIndex: 0 })),
      inputsFor: (i) => this.authority.inputsFor(i) as Map<string, { choice: number }>,
      answerFor: (i) =>
        guessRules.answerOf((this.game.rounds[i] as { content: GuessContent }).content),
    });
    return (scores.leaderboard ?? []).flatMap((p) =>
      p.id ? [{ id: p.id, name: p.name, score: p.score }] : [],
    );
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
      view.content = {
        kind: r.kind,
        prompt: r.content.prompt,
        options: r.content.options.map((o) => o.label),
      };
      const input = this.authority.inputsFor(round.index).get(id) as { choice: number } | undefined;
      if (input) view.ownChoice = input.choice;
      if (round.state === "reveal") {
        view.reveal = this.reveal(round.index);
        view.scores = this.scores();
      }
    }
    if (phase === "results") {
      view.scores = this.scores();
      view.history = this.game.rounds.map((r, i) => ({
        prompt: r.content.prompt,
        options: r.content.options.map((o) => o.label),
        reveal: this.reveal(i),
      }));
    }
    return view;
  }
  dispose() {
    this.authority.dispose();
    this.seen.clear();
  }
}
