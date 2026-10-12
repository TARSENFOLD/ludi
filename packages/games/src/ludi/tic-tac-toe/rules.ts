export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Difficulty = 'easy' | 'normal' | 'hard';
export const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]] as const;
export function result(board: Cell[]): Mark | 'draw' | null {
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]!;
  return board.every(Boolean) ? 'draw' : null;
}
export function emptyCells(board: Cell[]) { return board.flatMap((cell, i) => cell === null ? [i] : []); }
export function play(board: Cell[], cell: number, mark: Mark): Cell[] {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || board[cell] !== null || result(board)) throw new Error('Jogada inválida.');
  return board.map((value, i) => i === cell ? mark : value);
}
// Adapted from Smax1988/Tic-Tac-Toe Computer.js (MIT, Maximilian Schmidt).
// See LICENSE. Pure boards replace DOM mutations and shared winningLine state.
export function computerMove(board: Cell[], difficulty: Difficulty, random: () => number): number | undefined {
  if (result(board)) return undefined;
  const available = emptyCells(board);
  const randomMove = () => available[Math.floor(random() * available.length)];
  if (difficulty === 'easy') return randomMove();
  if (difficulty === 'normal') {
    for (const mark of ['O', 'X'] as const) {
      const winning = available.find(cell => result(play(board, cell, mark)) === mark);
      if (winning !== undefined) return winning;
    }
    return randomMove();
  }
  function minimax(position: Cell[], mark: Mark): number {
    const outcome = result(position);
    if (outcome) return outcome === 'O' ? 1 : outcome === 'X' ? -1 : 0;
    const scores = emptyCells(position).map(cell => minimax(play(position, cell, mark), mark === 'X' ? 'O' : 'X'));
    return mark === 'O' ? Math.max(...scores) : Math.min(...scores);
  }
  let best = available[0], score = -Infinity;
  for (const cell of available) {
    const evaluation = minimax(play(board, cell, 'O'), 'X');
    if (evaluation > score) { best = cell; score = evaluation; }
  }
  return best;
}
