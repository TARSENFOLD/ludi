import type { RuleEnvironment } from '@doot-games/sdk/ludi';
import { shuffleWith } from '../runtime/random';
import { ondaThemes, type OndaTheme } from './content/na-mesma-onda.server';
import { getLudiManifest } from './catalog';
import { spectrumRound } from './rounds';
import type { GameDefinition } from './controller';
export const ONDA_ROUNDS = 6;
/** A room-local rolling window. Selection happens on creation/replay, never on view. */
export function createThemePicker(random: () => number, pool: readonly OndaTheme[] = ondaThemes) {
  if (pool.length < ONDA_ROUNDS || new Set(pool.map(t => t.id)).size !== pool.length)
    throw new Error('O conteúdo precisa de pelo menos seis temas com IDs únicos.');
  let history: string[] = [];
  return () => {
    while (pool.filter(t => !history.includes(t.id)).length < ONDA_ROUNDS) history.shift();
    const selected = shuffleWith(pool.filter(t => !history.includes(t.id)), random).slice(0, ONDA_ROUNDS);
    history = [...history, ...selected.map(t => t.id)].slice(-18);
    return selected;
  };
}
export function createOndaDefinition(environment: RuleEnvironment): GameDefinition {
  const pick = createThemePicker(environment.random);
  const nextRounds = () => pick().map(t => spectrumRound({ prompt: t.prompt, leftLabel: t.leftLabel, rightLabel: t.rightLabel, timer: null }));
  return { manifest: getLudiManifest('na-mesma-onda'), rounds: nextRounds(), nextRounds };
}
