import { LocalRoundAuthority } from '@doot-games/engine/local';
import type { LudiAction, LudiSession, LudiView } from '../contracts';
import { TicTacToeController } from './controller';
import { computerMove, type Difficulty } from './rules';
export class TicTacToeLocalRuntime implements LudiSession {
  private controller: TicTacToeController;
  private listeners = new Set<(view: LudiView) => void>();
  private closed = false;
  private sequence = 0;
  constructor(private mode: 'solo' | 'same-device', names: string[], private difficulty: Difficulty = 'normal', private random = Math.random) {
    if (!['easy', 'normal', 'hard'].includes(difficulty) || names.length !== (mode === 'solo' ? 1 : 2)) throw new Error('Configuração inválida.');
    this.controller = new TicTacToeController(mode, new LocalRoundAuthority(1), 'local-0');
    names.forEach((name, i) => this.controller.join(`local-${i}`, name));
    if (mode === 'solo') this.controller.join('computer', names[0]!.trim().toLowerCase() === 'computador' ? 'Computador O' : 'Computador');
  }
  private view() { return this.controller.playerView(this.mode === 'solo' ? 'local-0' : this.controller.localActor()); }
  observe(listener: (view: LudiView) => void) {
    if (this.closed) throw new Error('Partida terminada.');
    this.listeners.add(listener); listener(this.view()); return () => { this.listeners.delete(listener); };
  }
  availableActions() { return this.closed ? [] : this.view().actions; }
  async send(action: LudiAction) {
    if (this.closed) throw new Error('Partida terminada.');
    await this.controller.dispatch(this.mode === 'solo' ? 'local-0' : this.controller.localActor(), action);
    const view = this.view();
    if (!this.closed && this.mode === 'solo' && view.phase === 'active' && view.ticTacToe?.turn === 'computer') {
      const choice = computerMove(view.ticTacToe.board, this.difficulty, this.random);
      await this.controller.dispatch('computer', { id: `computer-${this.sequence++}`, match: view.match, round: 0, type: 'answer', choice, stage: view.stage });
    }
    if (!this.closed) for (const listener of this.listeners) listener(this.view());
  }
  disconnect() { this.closed = true; this.listeners.clear(); this.controller.dispose(); }
}
