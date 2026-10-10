import { describe, it, expect } from 'vitest';
import { createThemePicker } from './onda.server';
import { ondaThemes } from './content/na-mesma-onda.server';
import { seededShuffle } from '../runtime/random';
import { spectrumRound } from './rounds';
import { scoreSpectrum } from '../blocks/spectrum/logic';
import { discoverGames } from './catalog';

describe('Na Mesma Onda: existing Spectrum rules and original content', () => {
  it('has 48 unique, tagged themes and keeps 18 recent topics out of the next selection', () => {
    expect(ondaThemes).toHaveLength(48);
    expect(new Set(ondaThemes.map(t => t.id)).size).toBe(48);
    expect(ondaThemes.every(t => t.tags.length && t.prompt && t.leftLabel && t.rightLabel)).toBe(true);
    const a = createThemePicker(() => 0.37), b = createThemePicker(() => 0.37);
    let recent: string[] = [];
    for (let i = 0; i < 12; i++) {
      const picked = a().map(t => t.id);
      expect(picked).toEqual(b().map(t => t.id));
      expect(new Set(picked).size).toBe(6);
      expect(picked.every(id => !recent.includes(id))).toBe(true);
      recent = [...recent, ...picked].slice(-18);
    }
  });
  it('releases oldest exclusions for smaller pools and still chooses six distinct themes', () => {
    for (const size of [6, 7, 12, 20]) {
      const pick = createThemePicker(() => 0.5, ondaThemes.slice(0, size));
      for (let n = 0; n < 10; n++) expect(new Set(pick().map(t => t.id)).size).toBe(6);
    }
    expect(() => createThemePicker(() => 0, ondaThemes.slice(0, 5))).toThrow();
  });
  it('preserves deterministic Doot shuffle output', () => {
    expect(seededShuffle('room')([1,2,3,4,5,6])).toEqual(seededShuffle('room')([1,2,3,4,5,6]));
  });
  it('reuses Spectrum scoring including fractional means, extremes and equal duo scores', () => {
    const r = spectrumRound({ ...ondaThemes[0], timer: null });
    for (const values of [[0,100], [20,80], [50,50], [0,1,100], [0,20,40,60,80,100]]) {
      const inputs = new Map(values.map((value, i) => [`p${i}`, { value }]));
      const original = scoreSpectrum(inputs);
      expect(r.scores(inputs, [])).toEqual(original.scores);
      expect(r.reveal(inputs).mean).toBe(original.mean);
      const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
      expect([...original.scores.values()]).toEqual(values.map(value => Math.round(1000 * Math.max(0, (50 - Math.abs(value - mean)) / 50))));
      if (values.length === 2) expect(new Set(original.scores.values()).size).toBe(1);
    }
  });
  it('rejects malformed actions instead of relying on scorer clamping', () => {
    const r = spectrumRound({ ...ondaThemes[0], timer: null });
    const base = { id: 'test-action', match: 1, round: 0, type: 'answer' };
    for (const value of [-1, 101, 1.5, null, '50', NaN, Infinity, undefined]) expect(r.parseAnswer({ ...base, value })).toBeUndefined();
    expect(r.parseAnswer({ ...base, value: 50, choice: 0 })).toBeUndefined();
    expect(r.parseAnswer({ ...base, value: 0 })?.input).toEqual({ value: 0 });
    expect(r.parseAnswer({ ...base, value: 100 })?.input).toEqual({ value: 100 });
  });
  it('discovers the validated room game only for compatible filters', () => {
    expect(discoverGames({}).some(g => g.id === 'na-mesma-onda')).toBe(true);
    expect(discoverGames({ mode: 'room', players: 6, minutes: 6, vibe: 'thinking' }).map(g => g.id)).toEqual(['na-mesma-onda']);
    expect(discoverGames({ mode: 'solo', players: 1 }).map(g => g.id)).not.toContain('na-mesma-onda');
    expect(discoverGames({ mode: 'room', players: 6, minutes: 5 })).toEqual([]);
  });
});
