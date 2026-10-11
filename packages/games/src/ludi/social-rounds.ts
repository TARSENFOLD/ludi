/** Social mechanics reuse the existing choice renderer and pure poll/guess rules. */
import { actionEnvelopeSchema, z, type Participant } from '@doot-games/sdk/ludi';
import { defineRounds, defaultRoundFlow, type LudiRound, type RoundContext } from './rounds';
import type { ChoiceRound, RoundReveal, RoundHistory } from './contracts';
export type MomentType = 'quick-choice' | 'sync' | 'story' | 'perception' | 'custom' | 'prediction' | 'who-here';
export interface SocialMoment {
  id: string; prompt: string; type: MomentType; options?: string[];
  target?: Participant; correctIndex?: number; customId?: string;
}
const answered = (inputs: Map<string, unknown>) => new Map([...inputs].filter(([, v]) => !(v as { skip?: boolean }).skip));
const skipped = (inputs: Map<string, unknown>) => inputs.size - answered(inputs).size;
export function socialRound(moment: SocialMoment, players: Participant[]): LudiRound {
  const { target } = moment;
  const publicBase = { prompt: moment.prompt, momentType: moment.type, social: true, ...(target ? { targetName: target.name } : {}) };
  const history = (reveal: RoundReveal): RoundHistory => ({ prompt: moment.prompt, momentType: moment.type, ...(moment.customId ? { customId: moment.customId } : {}), ...(moment.options ? { options: [...moment.options] } : {}), reveal });
  if (moment.type === 'story' || moment.type === 'perception') {
    return {
      ...defaultRoundFlow, allowSkip: true,
      requiresInput: () => false, eligiblePlayers: () => [], isComplete: () => true,
      publicContent: () => ({ ...publicBase, kind: 'conversation' }),
      parseAnswer: () => undefined, legalAnswer: () => ({ type: 'next', label: 'Continuar' }),
      ownView: () => ({}), scores: () => new Map(),
      reveal: inputs => ({ skipped: skipped(inputs) }),
      history: inputs => history({ skipped: skipped(inputs) }),
    };
  }
  const custom = moment.type === 'custom';
  const base = defineRounds([{ kind: custom ? 'guess' : 'poll', content: {
    prompt: moment.prompt, ...(custom ? { correct: moment.correctIndex } : {}),
    options: moment.options!.map((label, i) => ({ label, ...(custom ? { correct: i === moment.correctIndex } : {}) })),
  } }])[0]!;
  const eligible = players.filter(p => !custom || p.id !== target?.id).map(p => p.id);
  const adapter: LudiRound = {
    ...base, allowSkip: true,
    publicContent: () => ({ ...base.publicContent(), ...publicBase }) as ChoiceRound,
    eligiblePlayers: () => eligible,
    isComplete: ctx => eligible.every(id => ctx.inputs.has(id)),
    ownView: input => (input as { skip?: boolean }).skip ? { skipped: true } : base.ownView(input),
    scores: () => new Map(),
    reveal: inputs => ({ ...base.reveal(answered(inputs)), skipped: skipped(inputs), ...(custom ? { authorName: target?.name, attempts: answered(inputs).size, matches: [...answered(inputs).values()].filter(v => (v as { choice: number }).choice === moment.correctIndex).length } : {}) }),
    history: inputs => history(adapter.reveal(inputs)),
  };
  if (moment.type === 'prediction') {
    if (!target) throw new Error('Prediction requires a target');
    const predictors = players.filter(p => p.id !== target.id).map(p => p.id);
    const stage = (ctx: RoundContext) => predictors.every(id => ctx.inputs.has(id)) ? 'target-answer' : 'prediction';
    const schema = actionEnvelopeSchema.extend({ type: z.literal('answer'), choice: z.number().int().min(0).max(moment.options!.length - 1), stage: z.enum(['prediction', 'target-answer']) }).strict();
    adapter.stage = ctx => stage(ctx);
    adapter.eligiblePlayers = ctx => stage(ctx) === 'prediction' ? predictors : [target.id];
    adapter.isComplete = ctx => players.every(p => ctx.inputs.has(p.id));
    adapter.parseAnswer = (raw, ctx) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success || !ctx || parsed.data.stage !== stage(ctx)) return;
      return { action: parsed.data, input: { choice: parsed.data.choice } };
    };
    adapter.legalAnswer = ctx => ({ ...base.legalAnswer(), stage: ctx ? stage(ctx) : undefined });
    adapter.reveal = inputs => {
      const actual = inputs.get(target.id) as { choice?: number; skip?: boolean } | undefined;
      const guesses = answered(new Map([...inputs].filter(([id]) => id !== target.id)));
      if (!actual || actual.skip) return { targetSkipped: true, skipped: skipped(inputs), authorName: target.name };
      return { correctIndex: actual.choice, correctLabel: moment.options![actual.choice!], predictions: guesses.size,
        matches: [...guesses.values()].filter(v => (v as { choice: number }).choice === actual.choice).length,
        skipped: skipped(inputs), authorName: target.name };
    };
  }
  return adapter;
}
