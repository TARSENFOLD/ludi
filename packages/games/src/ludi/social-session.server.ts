import type { Participant, RuleEnvironment } from '@doot-games/sdk/ludi';
import type { OwnQuestion, SocialConfig } from './contracts';
import { socialQuestions, type SocialQuestion } from './content/entre-nos-social.server';
import { shuffleWith } from '../runtime/random';
import { socialRound, type MomentType, type SocialMoment } from './social-rounds';
import { contextThemes } from './content/entre-nos-editorial.server';
import { getLudiManifest } from './catalog';
import type { GameDefinition } from './controller';
export type AuthoredQuestion = OwnQuestion & { authorPlayerId: string };
/** History and RNG belong to this room, and are only consumed on materialization. */
export function createSocialComposer(environment: RuleEnvironment, previouslySeen: () => Iterable<string> = () => []) {
  const uses = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  let ordinal = 0;
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
      const themes = new Map<string, number>();
      const external = new Set(previouslySeen());
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
        // Keep a light opening, then vary the route, avoiding adjacent identical mechanics where possible.
        const opening: MomentType = environment.random() < .5 ? 'quick-choice' : 'sync';
        const slots: MomentType[] = reason === 'continue'
          ? ['custom', 'prediction', 'story', 'custom']
          : ['prediction', opening === 'sync' ? 'quick-choice' : 'sync', 'story', players.length >= 3 ? 'who-here' : 'perception', 'custom', 'prediction', 'sync', 'perception', 'custom'];
        let customAvailable = customPool.filter(q => !usedCustom.has(q.id)).length;
        const remaining = slots.map(kind => kind === 'custom' && customAvailable-- <= 0 ? 'quick-choice' as const : kind);
        // Resolve the custom fallback before ordering. Backtrack only if a random
        // route would leave identical mechanics at the end (at most nine slots).
        const arrange = (pending: MomentType[], previous: MomentType): MomentType[] | undefined => {
          if (!pending.length) return [];
          for (const kind of shuffleWith([...new Set(pending)].filter(k => k !== previous), environment.random)) {
            const rest = [...pending]; rest.splice(rest.indexOf(kind), 1);
            const tail = arrange(rest, kind);
            if (tail) return [kind, ...tail];
          }
        };
        const kinds: MomentType[] = [opening, ...(arrange(remaining, opening) ?? remaining)];
        const maxDepth = { strangers: 2, friends: 4, couple: 4, group: 2, close: 4, random: 4 }[config.context];
        let moderateCount = 0;
        for (let i = 0; i < count; i++) {
          const kind = kinds[i % kinds.length]!;
          if (kind === 'custom' && custom()) continue;
          const candidates = pool.filter(q => (q.sensitivity !== 'moderate' || moderateCount < 2) && !selected.has(q.id) && (kind === 'custom' ? q.type === 'quick-choice' : q.type === kind));
          // Least-used tier first: depth/theme preferences never override a fresh compatible item.
          const exposure = (q: SocialQuestion) => uses.get(q.id) ?? (external.has(q.id) ? 1 : 0);
          const least = Math.min(...candidates.map(exposure));
          const fresh = candidates.filter(q => exposure(q) === least);
          const desired = Math.min(maxDepth, 1 + Math.floor(i * maxDepth / count));
          const rank = (q: SocialQuestion) => q.tags.reduce((n,t) => n + (themes.get(t) ?? 0) * 4, 0)
            + Math.abs(q.depth - desired) * 2 - (q.tags.some(t => contextThemes[config.context]!.includes(t)) ? 2 : 0);
          // On recycling, prefer the longest-unseen items before editorial tie-breaking.
          const q = shuffleWith(fresh, environment.random).sort((a,b) =>
            (least > 0 ? (lastSeen.get(a.id) ?? -1) - (lastSeen.get(b.id) ?? -1) : 0) || rank(a) - rank(b))[0];
          if (!q) throw new Error('Insufficient social content');
          if (q.sensitivity === 'moderate') moderateCount++;
          selected.add(q.id); uses.set(q.id, least + 1); lastSeen.set(q.id, ++ordinal);
          for (const theme of q.tags) themes.set(theme, (themes.get(theme) ?? 0) + 1);
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
      manifest: getLudiManifest('entre-nos'), collective: true, scoring: false, rounds: materialize(), nextRounds: materialize,
      canContinue: () => config.mode === 'entre-nos' || customPool.some(q => !usedCustom.has(q.id)),
      summarize: history => ({
        inTune: history.filter(h => h.momentType !== 'custom' && h.momentType !== 'prediction' && h.reveal.counts?.filter(n => n > 0).length === 1 && h.reveal.counts.reduce((a,b) => a+b,0) >= 2).length,
        divided: history.filter(h => h.momentType !== 'custom' && h.momentType !== 'prediction' && (h.reveal.counts?.filter(n => n > 0).length ?? 0) > 1).length,
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
