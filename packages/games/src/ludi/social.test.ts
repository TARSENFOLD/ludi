import { describe, it, expect } from 'vitest';
import { LocalRoundAuthority } from '@doot-games/engine/local';
import { MatchController } from './controller';
import { socialRound } from './social-rounds';
import { socialQuestions } from './content/entre-nos-social.server';
import { createSocialComposer } from './social-session.server';
import { getLudiManifest } from './catalog';
const players = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }, { id: 'c', name: 'Carla' }];
const env = { now: () => 10, random: () => .35 };
let id = 0;
const action = (type: string, extras = {}) => ({ id: `social-action-${++id}`, match: 1, round: 0, type, ...extras });
function match(round: ReturnType<typeof socialRound>, roster = players) {
  const m = new MatchController({ manifest: getLudiManifest('entre-nos'), rounds: [round], scoring: false }, 'room', new LocalRoundAuthority(1), 'a', env);
  roster.forEach(p => m.join(p.id, p.name)); return m;
}
describe('social rounds: headless rules and privacy', () => {
  it('contains 200 original unique, annotated questions with valid options and broad context coverage', () => {
    expect(socialQuestions.length).toBeGreaterThanOrEqual(200);
    expect(new Set(socialQuestions.map(q => q.id)).size).toBe(socialQuestions.length);
    expect(new Set(socialQuestions.map(q => q.prompt)).size).toBe(socialQuestions.length);
    for (const q of socialQuestions) {
      expect(q.id).toMatch(/^en-/); expect(q.tags.length).toBeGreaterThan(0);
      if (q.options) { expect(q.options.length).toBe(4); expect(new Set(q.options).size).toBe(4); }
    }
    for (const c of ['strangers','friends','couple','group','close','random']) expect(socialQuestions.filter(q => q.contexts.includes(c as never)).length).toBeGreaterThanOrEqual(30);
  });
  it.each([2,3])('excludes a custom author from quorum with %i participants and preserves shuffled solution', async count => {
    const roster = players.slice(0,count), r = socialRound({ id: 'q', customId: 'q', type: 'custom', prompt: 'Uma pergunta privada', options: ['Uma','Duas','Três'], correctIndex: 2, target: roster[0] }, roster);
    const m = match(r, roster); await m.dispatch('a', action('start'));
    expect(m.playerView('a').actions).toEqual([]);
    await expect(m.dispatch('a', action('answer', { choice: 2 }))).rejects.toThrow();
    for (const p of roster.slice(1)) { expect(m.playerView(p.id).reveal).toBeUndefined(); await m.dispatch(p.id, action('answer', { choice: 2 })); }
    expect(m.playerView('a').roundState).toBe('locked');
    await m.dispatch('a', action('reveal')); expect(m.playerView('a').reveal?.correctIndex).toBe(2);
    expect(m.playerView('a').reveal?.matches).toBe(count-1); expect(m.playerView('a').scores).toBeUndefined();
  });
  it('gates prediction stages, hides predictions from target, rejects stale stage and counts guesses only', async () => {
    const r = socialRound({ id: 'p', type: 'prediction', prompt: 'O que escolheria?', options: ['A','B'], target: players[0] }, players);
    const m = match(r); await m.dispatch('a', action('start'));
    await expect(m.dispatch('a', action('answer', { choice: 1, stage: 'prediction' }))).rejects.toThrow();
    await m.dispatch('b', action('answer', { choice: 1, stage: 'prediction' }));
    await m.dispatch('c', action('skip'));
    const target = m.playerView('a'); expect(target.stage).toBe('target-answer'); expect(target.ownChoice).toBeUndefined(); expect(target.reveal).toBeUndefined();
    await expect(m.dispatch('a', action('answer', { choice: 1, stage: 'prediction' }))).rejects.toThrow();
    await m.dispatch('a', action('answer', { choice: 1, stage: 'target-answer' }));
    expect(m.playerView('b').ownChoice).toBe(1); expect(m.playerView('b').reveal).toBeUndefined();
    await m.dispatch('a', action('reveal'));
    expect(m.playerView('b').reveal).toMatchObject({ correctIndex: 1, matches: 1, predictions: 1, skipped: 1 });
  });
  it('lets a target pass without disclosing a solution or treating it as wrong', async () => {
    const m = match(socialRound({ id: 'p', type: 'prediction', prompt: 'Escolha', options: ['A','B'], target: players[0] }, players));
    await m.dispatch('a', action('start'));
    await m.dispatch('b', action('skip')); await m.dispatch('c', action('skip')); await m.dispatch('a', action('skip')); await m.dispatch('a', action('reveal'));
    expect(m.playerView('a').reveal).toEqual({ targetSkipped: true, skipped: 3, authorName: 'Ana' });
  });
  it('keeps text private, treats passing individually and reveals only on quorum', async () => {
    const m = new MatchController({ manifest: getLudiManifest('entre-nos'), rounds: [socialRound({ id:'s', type:'story', prompt:'Conta uma história.' }, players)], scoring:false, collective:true }, 'room', new LocalRoundAuthority(1), 'a', env);
    players.forEach(p => m.join(p.id,p.name)); await m.dispatch('a',action('start'));
    for (const extra of [{choice:0},{response:'text',text:''},{response:'text',text:'x'.repeat(501)},{response:'text',text:'bad\u0000'},{response:'oral',text:'extra'}]) await expect(m.dispatch('b',action('answer',extra))).rejects.toThrow();
    await m.dispatch('b',action('skip'));
    expect(m.playerView('a').phase).toBe('active'); expect(m.playerView('a').roundState).toBe('open');
    const cmd=action('answer',{response:'text',text:'PRIVATE story'});
    await m.dispatch('c',cmd); await m.dispatch('c',cmd);
    expect(JSON.stringify(m.playerView('a'))).not.toContain('PRIVATE story');
    expect(m.playerView('c').ownText).toBe('PRIVATE story');
    await expect(m.dispatch('c',action('answer',{response:'text',text:'second'}))).rejects.toThrow();
    await m.dispatch('a',action('answer',{response:'oral'}));
    expect(m.playerView('a').reveal).toEqual({skipped:1,contributions:[{playerId:'a',name:'Ana',oral:true},{playerId:'c',name:'Carla',text:'PRIVATE story'}]});
    await expect(m.dispatch('a',action('finish'))).rejects.toThrow();
    const ready=action('ready'); await m.dispatch('a',ready); await m.dispatch('a',ready);
    await m.dispatch('b',action('ready')); expect(m.playerView('c').phase).toBe('active');
    expect(m.playerView('c').participation?.ready).toEqual(['a','b']);
    await m.dispatch('c',action('ready')); expect(m.playerView('a').phase).toBe('results');
    expect(m.playerView('a').history?.[0]?.reveal.contributions?.[1]?.text).toBe('PRIVATE story');
  });
  it('materializes stable choices, contexts and recent-history exclusions using injected RNG', () => {
    const trace = () => {
      let seed = 0;
      const compose = createSocialComposer({ now: env.now, random: () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 });
      const game = compose({ context: 'strangers', mode: 'entre-nos' }, players, []);
      const first = game.rounds.map(r => r.publicContent());
      expect(game.rounds.map(r => r.publicContent())).toEqual(first);
      const next = game.nextRounds!('continue').map(r => r.publicContent());
      expect(next).toHaveLength(5); expect(next.every(r => first.every(f => f.prompt !== r.prompt))).toBe(true);
      return [first, next];
    };
    expect(trace()).toEqual(trace());
  });
  it('uses remaining personal questions in Mais 5 of the mixed mode', () => {
    const custom = players.map(p => ({ id: p.id, authorPlayerId: p.id, prompt: `Pergunta de ${p.name}`, options: ['Uma','Duas'], correctIndex: 1, status: 'submitted' as const }));
    const game = createSocialComposer(env)({ context: 'friends', mode: 'entre-nos' }, players, custom);
    const first = game.rounds.map(r => r.history(new Map())).filter(h => h.customId).map(h => h.customId);
    const next = game.nextRounds!('continue').map(r => r.history(new Map())).filter(h => h.customId).map(h => h.customId);
    expect(first).toHaveLength(2); expect(next).toHaveLength(1); expect(first).not.toContain(next[0]);
  });
  it('mixes authors, continues unused custom content, and remaps shuffled correct options', () => {
    const custom = players.flatMap(p => Array.from({ length: 5 }, (_, i) => ({ id: `${p.id}-${i}`, authorPlayerId: p.id, prompt: `${p.name} pergunta ${i}`, options: ['Errado','Correto','Também não'], correctIndex: 1, status: 'submitted' as const })));
    const game = createSocialComposer(env)({ context: 'friends', mode: 'quem-me-conhece' }, players, custom);
    expect(game.rounds).toHaveLength(10);
    const first = game.rounds.map(r => r.publicContent());
    for (const r of game.rounds) expect(r.reveal(new Map()).correctLabel).toBe('Correto');
    for (let i = 1; i < first.length; i++) expect((first[i] as { targetName: string }).targetName).not.toBe((first[i-1] as { targetName: string }).targetName);
    const next = game.nextRounds!('continue').map(r => r.publicContent());
    expect(next).toHaveLength(5); expect(next.every(r => first.every(f => f.prompt !== r.prompt))).toBe(true); expect(game.canContinue!()).toBe(false);
    expect(game.nextRounds!('replay')).toHaveLength(10);
  });
});
