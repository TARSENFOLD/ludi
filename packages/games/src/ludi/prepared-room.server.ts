/** Room preparation is separate from the materialized match. No transport or Vue. */
import type { RoundAuthority } from '@doot-games/engine/local';
import { actionEnvelopeSchema, participantNameSchema, z, type Participant, type RuleEnvironment } from '@doot-games/sdk/ludi';
import { MatchController, LudiError, type GameDefinition } from './controller';
import { getLudiManifest } from './catalog';
import type { LudiView, PreparationView, SocialConfig, SessionRelationship } from './contracts';
import { createSocialComposer, type AuthoredQuestion } from './social-session.server';
const key = z.string().regex(/^[\w-]{8,80}$/);
const context = z.enum(['strangers', 'friends', 'couple', 'group', 'close', 'random']);
const mode = z.enum(['entre-nos', 'quem-me-conhece']);
const text = (max: number) => z.string().trim().min(1).max(max).refine(s => !/[\x00-\x1f\x7f]/.test(s), 'Texto inválido.');
const question = z.object({ id: key, prompt: text(240), options: z.array(text(120)).min(2).max(5), correctIndex: z.number().int().min(0), status: z.enum(['draft','submitted']) }).strict().refine(q => q.correctIndex < q.options.length && new Set(q.options.map(o => o.toLocaleLowerCase('pt'))).size === q.options.length, 'Opções inválidas.');
const envelope = { id: key, revision: z.number().int().nonnegative() };
const preparationSchema = z.discriminatedUnion('type', [
  z.object({ ...envelope, type: z.literal('advance') }).strict(),
  z.object({ ...envelope, type: z.literal('context'), context }).strict(),
  z.object({ ...envelope, type: z.literal('mode'), mode }).strict(),
  z.object({ ...envelope, type: z.literal('back') }).strict(),
  z.object({ ...envelope, type: z.literal('save-question'), question }).strict(),
  z.object({ ...envelope, type: z.literal('delete-question'), questionId: key }).strict(),
  z.object({ ...envelope, type: z.literal('readiness'), ready: z.boolean() }).strict(),
  z.object({ ...envelope, type: z.literal('configure-again') }).strict(),
]);
export class PreparedRoom {
  private players: Participant[] = [];
  private questions = new Map<string, AuthoredQuestion>();
  private ready = new Set<string>();
  private step: PreparationView['step'] = 'lobby';
  private context?: SessionRelationship;
  private config: SocialConfig | null = null;
  private revision = 0;
  private matchNumber = 1;
  private match?: MatchController;
  private queue: Promise<void> = Promise.resolve();
  private seen = new Map<string, string>();
  private starting = false;
  private rosterSealed = false;
  private disposed = false;
  private compose: ReturnType<typeof createSocialComposer>;
  constructor(private creator: string, private env: RuleEnvironment, private authority: (definition: GameDefinition) => Promise<RoundAuthority>, private limit = 50) {
    this.limit = Math.max(1, Math.min(100, Math.floor(limit) || 50));
    this.compose = createSocialComposer(env);
  }
  get phase() { return this.match?.phase ?? 'lobby'; }
  hasPlayer(id: string) { return this.players.some(p => p.id === id); }
  join(id: string, name: unknown) {
    if (this.hasPlayer(id)) return;
    const parsed = participantNameSchema.safeParse(name);
    if (!parsed.success) throw new LudiError(400, 'Usa um nome entre 1 e 32 caracteres.');
    if (this.match || this.starting || this.rosterSealed || this.players.length >= 6) throw new LudiError(409, 'A sala está cheia ou a partida começou.');
    if (this.players.some(p => p.name.toLocaleLowerCase('pt') === parsed.data.toLocaleLowerCase('pt'))) throw new LudiError(409, 'Esse nome já está em uso.');
    this.players.push({ id, name: parsed.data }); this.revision++;
  }
  private canStart() { return this.step === 'questions' && !!this.config && this.players.length >= 2 && this.players.every(p => this.ready.has(p.id) && (this.config?.mode !== 'quem-me-conhece' || [...this.questions.values()].some(q => q.authorPlayerId === p.id && q.status !== 'draft'))); }
  private enqueue(job: () => Promise<void> | void) {
    const task = this.queue.then(() => { if (this.disposed) throw new LudiError(410, 'A sala terminou.'); return job(); });
    this.queue = task.catch(() => {}); return task;
  }
  private remember(key: string, fingerprint: string) { this.seen.set(key, fingerprint); if (this.seen.size > 1024) this.seen.delete(this.seen.keys().next().value!); }
  private repeated(id: string, rawId: string, fingerprint: string) {
    const old = this.seen.get(`${id}:${rawId}`);
    if (old && old !== fingerprint) throw new LudiError(409, 'Identificador já usado noutra operação.');
    return !!old;
  }
  prepare(id: string, raw: unknown) { return this.enqueue(() => {
    if (!this.hasPlayer(id)) throw new LudiError(403, 'Entra na sala.');
    const parsed = preparationSchema.safeParse(raw);
    if (!parsed.success) throw new LudiError(400, 'Verifica a pergunta, as opções e a resposta certa.');
    const a = parsed.data, fingerprint = `prepare:${JSON.stringify(a)}`;
    if (this.repeated(id, a.id, fingerprint)) return;
    if (a.revision !== this.revision) throw new LudiError(409, 'A sala foi atualizada. Confirma o estado e tenta novamente.');
    if (a.type === 'configure-again') {
      if (id !== this.creator || this.match?.phase !== 'results') throw new LudiError(409, 'Termina a partida para mudar o contexto.');
      this.matchNumber = this.match.playerView(id).match + 1;
      this.match.dispose(); this.match = undefined; this.ready.clear(); this.step = 'context';
    } else {
      if (this.match) throw new LudiError(409, 'A preparação terminou.');
      if (['advance','context','mode','back'].includes(a.type) && id !== this.creator) throw new LudiError(403, 'Só quem criou a sala configura a sessão.');
      switch (a.type) {
        case 'advance':
          if (this.step !== 'lobby' || this.players.length < 2) throw new LudiError(409, 'Precisam de pelo menos duas pessoas.');
          this.step = 'context'; break;
        case 'context':
          if (this.step !== 'context') throw new LudiError(409, 'Esta etapa já passou.');
          this.context = a.context; this.step = 'mode'; this.ready.clear(); break;
        case 'mode':
          if (this.step !== 'mode' || !this.context) throw new LudiError(409, 'Escolhe o contexto primeiro.');
          this.config = { context: this.context, mode: a.mode }; this.step = 'questions'; this.ready.clear(); break;
        case 'back':
          this.step = this.step === 'questions' ? 'mode' : this.step === 'mode' ? 'context' : 'lobby'; this.ready.clear(); break;
        case 'save-question': {
          if (this.step !== 'questions' || this.ready.has(id)) throw new LudiError(409, 'Volta à preparação antes de editar.');
          const old = this.questions.get(a.question.id);
          if (old && old.authorPlayerId !== id) throw new LudiError(403, 'Só podes editar as tuas perguntas.');
          if (!old && [...this.questions.values()].filter(q => q.authorPlayerId === id).length >= this.limit) throw new LudiError(409, 'Atingiste o limite técnico de perguntas desta sala.');
          this.questions.set(a.question.id, { ...a.question, options: [...a.question.options], authorPlayerId: id }); break;
        }
        case 'delete-question': {
          if (this.step !== 'questions' || this.ready.has(id)) throw new LudiError(409, 'Volta à preparação antes de editar.');
          const q = this.questions.get(a.questionId);
          if (!q || q.authorPlayerId !== id) throw new LudiError(403, 'Só podes apagar as tuas perguntas.');
          this.questions.delete(a.questionId); break;
        }
        case 'readiness':
          if (this.step !== 'questions') throw new LudiError(409, 'A preparação ainda não começou.');
          if (a.ready && this.config?.mode === 'quem-me-conhece' && ![...this.questions.values()].some(q => q.authorPlayerId === id && q.status !== 'draft')) throw new LudiError(409, 'Guarda pelo menos uma pergunta antes de ficar pronto.');
          if (a.ready) this.ready.add(id); else this.ready.delete(id); break;
      }
    }
    this.remember(`${id}:${a.id}`, fingerprint); this.revision++;
  }); }
  dispatch(id: string, raw: unknown) { return this.enqueue(async () => {
    if (!this.hasPlayer(id)) throw new LudiError(403, 'Entra na sala.');
    const parsed = actionEnvelopeSchema.passthrough().safeParse(raw);
    if (!parsed.success) throw new LudiError(400, 'Ação inválida.');
    const a = parsed.data, fingerprint = `match:${JSON.stringify(a)}`;
    if (this.repeated(id, a.id, fingerprint)) return;
    if (!this.match) {
      if (!actionEnvelopeSchema.strict().safeParse(raw).success || a.type !== 'start' || a.match !== this.matchNumber || a.round !== 0 || id !== this.creator || !this.canStart()) throw new LudiError(409, 'A sala ainda não está pronta para começar.');
      this.starting = true;
      try {
        const definition = this.compose(this.config!, this.players, [...this.questions.values()]);
        const authority = await this.authority(definition);
        if (this.disposed) { authority.dispose(); throw new LudiError(410, 'A sala terminou.'); }
        const match = new MatchController(definition, 'room', authority, this.creator, this.env, this.matchNumber);
        try { for (const p of this.players) match.join(p.id, p.name); await match.dispatch(id, raw); }
        catch (e) { match.dispose(); throw e; }
        this.match = match; this.rosterSealed = true;
      } finally { this.starting = false; }
    } else await this.match.dispatch(id, raw);
    this.remember(`${id}:${a.id}`, fingerprint); this.revision++;
  }); }
  playerView(id: string): LudiView {
    if (!this.hasPlayer(id)) throw new LudiError(403, 'Entra na sala.');
    if (this.match) return { ...this.match.playerView(id), revision: this.revision };
    const manifest = getLudiManifest('entre-nos');
    return {
      context: { mode: 'room', execution: 'remote', surface: id === this.creator ? 'primary' : 'participant', locale: 'pt-PT', participantId: id, permissions: { control: id === this.creator } },
      gameId: manifest.id, title: manifest.name, revision: this.revision, match: this.matchNumber, phase: 'preparation', round: 0, roundState: 'ready', totalRounds: 0,
      players: this.players.map(p => ({ ...p })), actions: id === this.creator && this.canStart() ? [{ type: 'start', label: 'Começar a conversa' }] : [],
      preparation: { step: this.step, config: this.config ? { ...this.config } : null, context: this.context, limit: this.limit,
        progress: this.players.map(p => ({ playerId: p.id, count: [...this.questions.values()].filter(q => q.authorPlayerId === p.id && q.status !== 'draft').length, ready: this.ready.has(p.id) })),
        ownQuestions: [...this.questions.values()].filter(q => q.authorPlayerId === id).map(q => ({ id: q.id, prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, status: q.status })),
      },
    };
  }
  dispose() { this.disposed = true; this.match?.dispose(); this.questions.clear(); this.ready.clear(); this.seen.clear(); }
}
