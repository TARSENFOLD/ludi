import type { Participant, RuleEnvironment } from '@doot-games/sdk/ludi';
import type { OwnQuestion, SocialConfig } from './contracts';
import { socialQuestions, type SocialQuestion } from './content/entre-nos-social.server';
import { shuffleWith } from '../runtime/random';
import { socialRound, type MomentType, type SocialMoment } from './social-rounds';
import { getLudiManifest } from './catalog';
import type { GameDefinition } from './controller';
export type AuthoredQuestion = OwnQuestion & { authorPlayerId: string };
/** History and RNG belong to this room, and are only consumed on materialization. */
export function createSocialComposer(environment: RuleEnvironment) {
  let recent: string[] = [];
  let usedCustom = new Set<string>();
  let targetOffset = 0;
  return (config: SocialConfig, players: Participant[], questions: AuthoredQuestion[]): GameDefinition => {
    const customPool = questions.filter(q => q.status !== 'draft');
    usedCustom = new Set([...usedCustom].filter(id => customPool.some(q => q.id === id)));
    const pool = socialQuestions.filter(q => q.minPlayers <= players.length && q.contexts.includes(config.context));
    const materialize = (reason?: 'replay' | 'continue') => {
      if (reason !== 'continue') usedCustom.clear();
      const moments: SocialMoment[] = [];
      const selected = new Set<string>();
      let lastAuthor = '';
      const custom = () => {
        const eligible = customPool.filter(q => !usedCustom.has(q.id));
        const choices = eligible.filter(q => q.authorPlayerId !== lastAuthor);
        const q = shuffleWith(choices.length ? choices : eligible, environment.random)[0];
        if (!q) return false;
        const order = shuffleWith(q.options.map((label, index) => ({ label, index })), environment.random);
        moments.push({ id: q.id, customId: q.id, type: 'custom', prompt: q.prompt, options: order.map(o => o.label), correctIndex: order.findIndex(o => o.index === q.correctIndex), target: players.find(p => p.id === q.authorPlayerId)! });
        usedCustom.add(q.id); lastAuthor = q.authorPlayerId;
        return true;
      };
      const count = reason === 'continue' ? 5 : 10;
      if (config.mode === 'quem-me-conhece') {
        for (let i = 0; i < count; i++) if (!custom()) break;
      } else {
        const kinds: MomentType[] = reason === 'continue' ? ['custom', 'prediction', 'sync', 'story', 'custom'] : ['quick-choice', 'prediction', 'sync', 'story', players.length >= 3 ? 'who-here' : 'perception', 'custom', 'prediction', 'sync', 'perception', 'custom'];
        const depthPlans = { strangers: [1,1,1,2,2,2,2,2,4,1], friends: [1,1,2,2,2,3,3,4,4,2], couple: [1,2,2,3,4,3,3,4,4,2], group: [1,1,2,1,2,2,2,2,4,1], close: [2,2,2,3,4,3,3,4,4,2], random: [1,1,2,2,2,3,3,4,4,2] };
        const depths = depthPlans[config.context];
        let moderateCount = 0;
        for (let i = 0; i < count; i++) {
          const kind = kinds[i % kinds.length]!;
          if (kind === 'custom' && custom()) continue;
          const candidates = pool.filter(q => (q.sensitivity !== 'moderate' || moderateCount < 2) && !selected.has(q.id) && (kind === 'custom' ? q.type === 'quick-choice' : q.type === kind));
          while (candidates.length && candidates.every(q => recent.includes(q.id))) recent.shift();
          const fresh = candidates.filter(q => !recent.includes(q.id));
          const desired = depths[i]!;
          const nearest = (items: SocialQuestion[]) => items.sort((a, b) => Math.abs(a.depth - desired) - Math.abs(b.depth - desired));
          const q = nearest(shuffleWith(fresh.length ? fresh : candidates, environment.random))[0];
          if (!q) throw new Error('Insufficient social content');
          if (q.sensitivity === 'moderate') moderateCount++;
          selected.add(q.id); recent = [...recent, q.id].slice(-30);
          const target = q.type === 'prediction' || q.type === 'perception' ? players[targetOffset++ % players.length] : undefined;
          const options = q.type === 'who-here' ? players.map(p => p.name) : q.options ? shuffleWith(q.options, environment.random) : undefined;
          moments.push({ id: q.id, prompt: q.prompt, type: q.type, options, target });
          lastAuthor = '';
        }
      }
      if (!moments.length) throw new Error('No questions left');
      return moments.map(m => socialRound(m, players));
    };
    const definition: GameDefinition = {
      manifest: getLudiManifest('entre-nos'), scoring: false, rounds: materialize(), nextRounds: materialize,
      canContinue: () => config.mode === 'entre-nos' || customPool.some(q => !usedCustom.has(q.id)),
      summarize: history => ({
        inTune: history.filter(h => h.reveal.counts?.filter(n => n > 0).length === 1 && h.reveal.counts.reduce((a,b) => a+b,0) >= 2).length,
        divided: history.filter(h => (h.reveal.counts?.filter(n => n > 0).length ?? 0) > 1).length,
        predictions: history.reduce((n, h) => n + (h.reveal.predictions ?? 0), 0),
        correctPredictions: history.filter(h => h.momentType === 'prediction').reduce((n,h) => n + (h.reveal.matches ?? 0), 0),
        customUsed: history.filter(h => h.customId).length,
        customAttempts: history.filter(h => h.customId).reduce((n,h) => n + (h.reveal.attempts ?? 0), 0),
        customMatches: history.filter(h => h.customId).reduce((n,h) => n + (h.reveal.matches ?? 0), 0),
        customRemaining: customPool.filter(q => !usedCustom.has(q.id)).length,
        skipped: history.reduce((n,h) => n + (h.reveal.skipped ?? 0), 0),
      }),
    };
    return definition;
  };
}
