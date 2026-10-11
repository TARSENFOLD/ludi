/** Bound, pure round adapters: the coordinator does not switch on game/block IDs. */
import { actionEnvelopeSchema, z, type Participant } from '@doot-games/sdk/ludi';
import type { LudiAction, PublicRound, RoundReveal, RoundHistory, LegalAction } from './contracts';
import { guessContentSchema, guessRules } from '../blocks/guess/rules';
import { pollContentSchema, pollRules } from '../blocks/poll/rules';
import { spectrumContentSchema, spectrumInputSchema, scoreSpectrum } from '../blocks/spectrum/rules';

export interface RoundContext { players: Participant[]; inputs: Map<string, unknown> }
export const allPlayers = (ctx: RoundContext) => ctx.players.map(p => p.id);
export const allComplete = (ctx: RoundContext) => allPlayers(ctx).every(id => ctx.inputs.has(id));
export const defaultRoundFlow = {
  eligiblePlayers: allPlayers,
  isComplete: allComplete,
  requiresInput: () => true,
  stage: (_ctx: RoundContext): string | undefined => undefined,
};
export interface LudiRound {
  eligiblePlayers(ctx: RoundContext): string[];
  isComplete(ctx: RoundContext): boolean;
  requiresInput(ctx: RoundContext): boolean;
  stage(ctx: RoundContext): string | undefined;
  allowSkip?: boolean;
  publicContent(ctx?: RoundContext, participantId?: string): PublicRound;
  parseAnswer(raw: unknown, ctx?: RoundContext): { action: LudiAction; input: unknown } | undefined;
  legalAnswer(ctx?: RoundContext): LegalAction;
  ownView(input: unknown): { ownChoice?: number; ownValue?: number; skipped?: boolean };
  reveal(inputs: Map<string, unknown>): RoundReveal;
  scores(inputs: Map<string, unknown>, players: Participant[]): Map<string, number>;
  history(inputs: Map<string, unknown>): RoundHistory;
}
const choiceAction = actionEnvelopeSchema.extend({ type: z.literal('answer'), choice: z.number().int().nonnegative() }).strict();
const scaleAction = actionEnvelopeSchema.extend({ type: z.literal('answer'), value: spectrumInputSchema.shape.value }).strict();
export function defineRounds(rounds: Array<{ kind: 'poll' | 'guess'; content: unknown }>): LudiRound[] {
  return rounds.map(({ kind, content: raw }) => {
    const content = kind === 'poll' ? pollContentSchema.parse(raw) : guessContentSchema.parse(raw);
    const adapter: LudiRound = {
      ...defaultRoundFlow,
      publicContent: () => ({ kind, prompt: content.prompt, options: content.options.map(o => o.label) }),
      parseAnswer(raw) {
        const parsed = choiceAction.safeParse(raw);
        if (!parsed.success || parsed.data.choice >= content.options.length) return;
        return { action: parsed.data, input: { choice: parsed.data.choice } };
      },
      legalAnswer: () => ({ type: 'answer', label: 'Confirmar resposta', choices: content.options.map((_, i) => i) }),
      ownView: input => ({ ownChoice: (input as { choice: number }).choice }),
      reveal(inputs) {
        const ctx = { content, inputs: inputs as Map<string, { choice: number }>, players: [], answer: undefined };
        if (kind === 'poll') return { counts: pollRules.revealSummary(ctx).counts };
        const c = guessContentSchema.parse(content);
        const summary = guessRules.revealSummary({ ...ctx, content: c, answer: guessRules.answerOf(c) });
        return { correctIndex: summary.correctIndex, correctLabel: summary.correctLabel };
      },
      scores(inputs, players) {
        if (kind === 'poll') return new Map();
        const c = guessContentSchema.parse(content);
        const result = guessRules.aggregate({
          rounds: [{ index: 0, content: c }],
          players: players.map(p => ({ ...p, joinedAtIndex: 0 })),
          inputsFor: () => inputs as Map<string, { choice: number }>,
          answerFor: () => guessRules.answerOf(c),
        });
        return new Map((result.leaderboard ?? []).flatMap(p => p.id ? [[p.id, p.score] as const] : []));
      },
      history(inputs) { return { prompt: content.prompt, options: content.options.map(o => o.label), reveal: adapter.reveal(inputs) }; },
    };
    return adapter;
  });
}
export function spectrumRound(raw: unknown): LudiRound {
  const content = spectrumContentSchema.parse(raw);
  const tally = (inputs: Map<string, unknown>) => scoreSpectrum(inputs as Map<string, { value: number }>);
  const adapter: LudiRound = {
      ...defaultRoundFlow,
    publicContent: () => ({ kind: 'spectrum', prompt: content.prompt, leftLabel: content.leftLabel, rightLabel: content.rightLabel }),
    parseAnswer(raw) {
      const parsed = scaleAction.safeParse(raw);
      if (!parsed.success) return;
      return { action: parsed.data, input: { value: parsed.data.value } };
    },
    legalAnswer: () => ({ type: 'answer', label: 'Confirmar posição', range: { min: 0, max: 100, step: 1 } }),
    ownView: input => ({ ownValue: (input as { value: number }).value }),
    reveal(inputs) {
      const { mean, marks, scores } = tally(inputs);
      // Sorting avoids encoding submission/roster order into otherwise anonymous marks.
      return { mean, marks: marks.map(m => m.value).sort((a, b) => a - b), ...(marks.length === 2 ? { duoScore: scores.values().next().value } : {}) };
    },
    scores: inputs => tally(inputs).scores,
    history(inputs) { return { prompt: content.prompt, leftLabel: content.leftLabel, rightLabel: content.rightLabel, reveal: adapter.reveal(inputs) }; },
  };
  return adapter;
}
