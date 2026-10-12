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
  const publicBase = { ...(moment.id.startsWith('en-') ? { officialId: moment.id } : {}), prompt: moment.prompt, momentType: moment.type, social: true, ...(target ? { targetName: target.name } : {}) };
  const history = (reveal: RoundReveal): RoundHistory => ({ prompt: moment.prompt, momentType: moment.type, ...(moment.customId ? { customId: moment.customId } : {}), ...(moment.options ? { options: [...moment.options] } : {}), reveal });
  if (moment.type === 'story' || moment.type === 'perception') {
    const schema = z.discriminatedUnion('response', [
      actionEnvelopeSchema.extend({ type: z.literal('answer'), response: z.literal('text'), text: z.string().trim().min(1).max(500).refine(s => !/[\x00-\x08\x0b-\x1f\x7f]/.test(s)) }).strict(),
      actionEnvelopeSchema.extend({ type: z.literal('answer'), response: z.literal('oral') }).strict(),
    ]);
    const reveal = (inputs: Map<string, unknown>): RoundReveal => ({
      skipped: skipped(inputs),
      contributions: players.flatMap(p => {
        const v = inputs.get(p.id) as { response?: string; text?: string; skip?: boolean } | undefined;
        return !v || v.skip ? [] : [{ playerId: p.id, name: p.name, ...(v.response === 'text' ? { text: v.text } : { oral: true }) }];
      }),
    });
    return {
      ...defaultRoundFlow, allowSkip: true,
      publicContent: () => ({ ...publicBase, kind: 'conversation' }),
      parseAnswer: raw => {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return;
        return { action: parsed.data, input: parsed.data.response === 'text' ? { response: 'text', text: parsed.data.text } : { response: 'oral' } };
      },
      legalAnswer: () => ({ type: 'answer', label: 'Partilhar resposta' }),
      ownView: input => {
        const v = input as { skip?: boolean; response?: string; text?: string };
        return v.skip ? { skipped: true } : v.response === 'text' ? { ownText: v.text } : { oralShared: true };
      },
      scores: () => new Map(), reveal, history: inputs => history(reveal(inputs)),
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
    reveal: inputs => ({ ...base.reveal(answered(inputs)), skipped: skipped(inputs), ...(custom ? { counts: moment.options!.map((_, i) => [...answered(inputs).values()].filter(v => (v as {choice: number}).choice === i).length), authorName: target?.name, attempts: answered(inputs).size, matches: [...answered(inputs).values()].filter(v => (v as { choice: number }).choice === moment.correctIndex).length } : {}) }),
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
      return { counts: moment.options!.map((_, i) => [...guesses.values()].filter(v => (v as {choice: number}).choice === i).length), correctIndex: actual.choice, correctLabel: moment.options![actual.choice!], predictions: guesses.size,
        matches: [...guesses.values()].filter(v => (v as { choice: number }).choice === actual.choice).length,
        skipped: skipped(inputs), authorName: target.name };
    };
  }
  return adapter;
}
