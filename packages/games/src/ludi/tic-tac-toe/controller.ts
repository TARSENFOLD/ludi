import type { RoundAuthority } from '@doot-games/engine/local';
import { actionEnvelopeSchema, participantNameSchema, z, type LudiMode, type Participant } from '@doot-games/sdk/ludi';
import { getLudiManifest } from '../catalog';
import { LudiError } from '../controller';
import type { LudiView } from '../contracts';
import { emptyCells, play, result, type Cell } from './rules';
const moveSchema = actionEnvelopeSchema.extend({ choice: z.number().int().min(0).max(8), stage: z.string() }).strict();
export const ticTacToeDefinition = { manifest: getLudiManifest('jogo-da-velha'), rounds: [{}] };
export class TicTacToeController {
  private players: Participant[] = [];
  private board: Cell[] = Array(9).fill(null);
  private match = 1;
  private revision = 0;
  private wins: [number, number] = [0, 0];
  private draws = 0;
  private seen = new Map<string, string>();
  private queue: Promise<void> = Promise.resolve();
  private closed = false;
  constructor(private mode: LudiMode, private authority: RoundAuthority, private creator: string) {}
  get phase() { return this.authority.state().phase; }
  private get ply() { return this.board.filter(Boolean).length; }
  localActor() { return this.players[this.ply % 2]?.id ?? this.creator; }
  join(id: string, rawName: unknown) {
    if (this.closed) throw new LudiError(410, 'Partida terminada.');
    if (this.players.some(p => p.id === id)) return;
    const name = participantNameSchema.safeParse(rawName);
    if (!name.success) throw new LudiError(400, 'Usa um nome entre 1 e 32 caracteres.');
    if (this.phase !== 'lobby' || this.players.length >= 2) throw new LudiError(409, 'Esta sala já está cheia ou a partida começou.');
    if (this.players.some(p => p.name.toLocaleLowerCase('pt') === name.data.toLocaleLowerCase('pt'))) throw new LudiError(409, 'Esse nome já está em uso.');
    this.players.push({ id, name: name.data }); this.revision++;
  }
  private legal(id: string): LudiView['actions'] {
    const control = this.mode !== 'room' || id === this.creator;
    if (this.phase === 'lobby') return control && this.players.length === 2 ? [{ type: 'start', label: 'Começar partida' }] : [];
    if (this.phase === 'results') return control ? [{ type: 'replay', label: 'Revanche' }] : [];
    return id === this.localActor() ? [{ type: 'answer', label: 'Jogar', stage: String(this.ply), choices: emptyCells(this.board) }] : [];
  }
  dispatch(id: string, raw: unknown) {
    const job = this.queue.then(() => this.apply(id, raw));
    this.queue = job.catch(() => {}); return job;
  }
  private async apply(id: string, raw: unknown) {
    if (this.closed) throw new LudiError(410, 'Partida terminada.');
    if (!this.players.some(p => p.id === id)) throw new LudiError(403, 'Entra na sala para jogar.');
    const parsed = actionEnvelopeSchema.passthrough().safeParse(raw);
    if (!parsed.success) throw new LudiError(400, 'Ação inválida.');
    const action = parsed.data, key = `${id}:${action.id}`, fingerprint = JSON.stringify(action);
    const previous = this.seen.get(key);
    if (previous) { if (previous !== fingerprint) throw new LudiError(409, 'Identificador já usado noutra ação.'); return; }
    if (action.match !== this.match || action.round !== 0 || !this.legal(id).some(a => a.type === action.type)) throw new LudiError(409, 'Esta ação já não está disponível.');
    if (action.type === 'answer') {
      const move = moveSchema.safeParse(raw);
      if (!move.success) throw new LudiError(400, 'Jogada inválida.');
      if (move.data.stage !== String(this.ply) || this.board[move.data.choice] !== null) throw new LudiError(409, 'O tabuleiro avançou. Escolhe uma casa livre.');
      this.board = play(this.board, move.data.choice, this.ply % 2 === 0 ? 'X' : 'O');
      const outcome = result(this.board);
      if (outcome) {
        if (outcome === 'draw') this.draws++; else this.wins[outcome === 'X' ? 0 : 1]++;
        this.authority.lock(); this.authority.reveal(); await this.authority.finish({ outcome });
      }
    } else {
      if (!actionEnvelopeSchema.strict().safeParse(raw).success) throw new LudiError(400, 'Ação inválida.');
      if (action.type === 'start') this.authority.start();
      else { this.match++; this.board = Array(9).fill(null); this.authority.replay(1); }
      this.authority.open();
    }
    this.seen.set(key, fingerprint);
    if (this.seen.size > 512) this.seen.delete(this.seen.keys().next().value!);
    this.revision++;
  }
  playerView(id: string): LudiView {
    if (!this.players.some(p => p.id === id)) throw new LudiError(403, 'Entra na sala para jogar.');
    const control = this.mode !== 'room' || id === this.creator;
    return {
      context: { mode: this.mode, execution: this.mode === 'room' ? 'remote' : 'local', surface: control ? 'primary' : 'participant', locale: 'pt-PT', participantId: id, permissions: { control } },
      gameId: 'jogo-da-velha', title: 'Jogo da Velha', capacity: { min: 2, max: 2 }, revision: this.revision, match: this.match,
      phase: this.phase, round: 0, totalRounds: 1, roundState: this.authority.state().round.state,
      players: this.players.map(p => ({ ...p })), actions: this.legal(id), stage: String(this.ply),
      ticTacToe: { board: [...this.board], turn: this.localActor(), outcome: result(this.board), draws: this.draws },
      scores: this.players.map((p, i) => ({ ...p, score: this.wins[i] ?? 0 })),
    };
  }
  dispose() { this.closed = true; this.seen.clear(); this.authority.dispose(); }
}
