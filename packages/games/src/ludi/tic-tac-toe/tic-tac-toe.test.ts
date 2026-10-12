import { expect, it } from 'vitest';
import { LocalRoundAuthority } from '@doot-games/engine/local';
import { TicTacToeController } from './controller';
import { TicTacToeLocalRuntime } from './local';
import { lines, result, play, emptyCells, computerMove, type Cell } from './rules';
import type { LudiView } from '../contracts';
it('detects every winning line, draws, and rejects occupied or invalid cells', () => {
  for (const line of lines) for (const mark of ['X', 'O'] as const) {
    const board: Cell[] = Array(9).fill(null); line.forEach(i => { board[i] = mark; });
    expect(result(board)).toBe(mark); expect(() => play(board, 0, 'X')).toThrow();
  }
  expect(result(['X','O','X','X','O','O','O','X','X'])).toBe('draw');
  for (const cell of [-1, 9, 0.5, NaN]) expect(() => play(Array(9).fill(null), cell, 'X')).toThrow();
  expect(() => play(['X',null,null,null,null,null,null,null,null], 0, 'O')).toThrow();
});
it('hard AI never loses against any possible human sequence', () => {
  function explore(board: Cell[]) {
    expect(result(board)).not.toBe('X'); if (result(board)) return;
    for (const cell of emptyCells(board)) {
      const human = play(board, cell, 'X'); expect(result(human)).not.toBe('X');
      if (result(human)) continue;
      const before = [...human], move = computerMove(human, 'hard', () => 0)!;
      expect(human).toEqual(before); explore(play(human, move, 'O'));
    }
  }
  explore(Array(9).fill(null));
});
it('normal AI takes a win before blocking and easy uses injected randomness', () => {
  expect(computerMove(['X','X',null,'O','O',null,null,null,null], 'normal', () => 0)).toBe(5);
  expect(computerMove(['X','X',null,null,'O',null,null,null,null], 'normal', () => 0)).toBe(2);
  expect(computerMove(Array(9).fill(null), 'easy', () => 0.99)).toBe(8);
});
it('rejects wrong turns, stale moves, duplicate payload changes and simultaneous double moves', async () => {
  const c = new TicTacToeController('room', new LocalRoundAuthority(1), 'a'); c.join('a', 'Ana'); c.join('b', 'Bia');
  const start = { id: 'start-000', type: 'start', match: 1, round: 0 };
  await c.dispatch('a', start);
  const move = { id: 'answer-00', type: 'answer', match: 1, round: 0, stage: '0', choice: 0 };
  await expect(c.dispatch('b', move)).rejects.toThrow();
  const both = await Promise.allSettled([c.dispatch('a', move), c.dispatch('a', { ...move, id: 'answer-01', choice: 1 })]);
  expect(both.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  const revision = c.playerView('a').revision; await c.dispatch('a', move); expect(c.playerView('a').revision).toBe(revision);
  await expect(c.dispatch('a', { ...move, choice: 2 })).rejects.toThrow();
  await expect(c.dispatch('b', { ...move, id: 'answer-02', choice: 2 })).rejects.toThrow();
  await expect(c.dispatch('b', { ...move, id: 'answer-03', stage: '1', choice: 0 })).rejects.toThrow();
  await c.dispatch('b', { ...move, id: 'answer-04', stage: '1', choice: 1 });
  expect(c.playerView('a').ticTacToe?.board.slice(0,2)).toEqual(['X','O']);
  const snapshot = c.playerView('a'); snapshot.ticTacToe!.board[0] = null; expect(c.playerView('a').ticTacToe!.board[0]).toBe('X');
  c.dispose(); await expect(c.dispatch('a', start)).rejects.toThrow();
});
it('plays locally, retains score on replay and invalidates old match actions', async () => {
  const runtime = new TicTacToeLocalRuntime('same-device', ['Ana','Bia']); let view!: LudiView; let sequence = 0;
  runtime.observe(v => { view = v; });
  const send = (type: 'start' | 'answer' | 'replay', choice?: number) => runtime.send({ id: `request-${sequence++}`, match: view.match, round: 0, type, ...(type === 'answer' ? { choice, stage: view.stage } : {}) });
  await send('start'); for (const cell of [0,3,1,4,2]) await send('answer', cell);
  expect(view.phase).toBe('results'); expect(view.scores?.[0].score).toBe(1);
  await send('replay'); expect(view.match).toBe(2); expect(view.scores?.[0].score).toBe(1); expect(view.ticTacToe?.board.every(c => c === null)).toBe(true);
  await expect(runtime.send({ id: 'stale-000', match: 1, round: 0, type: 'answer', choice: 0, stage: '0' })).rejects.toThrow();
  runtime.disconnect();
});
it('solo sends computer moves through the same authority', async () => {
  const runtime = new TicTacToeLocalRuntime('solo', ['Ana'], 'hard'); let view!: LudiView;
  runtime.observe(v => { view = v; }); await runtime.send({ id: 'start-000', type: 'start', match: 1, round: 0 });
  await runtime.send({ id: 'answer-00', type: 'answer', match: 1, round: 0, choice: 0, stage: '0' });
  expect(view.ticTacToe?.board.filter(Boolean)).toHaveLength(2); expect(view.ticTacToe?.turn).toBe('local-0'); runtime.disconnect();
});
