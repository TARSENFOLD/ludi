/** Concrete wire contracts belong to games, not the SDK/session core. */
import type { LudiView as View, LudiSession as Session, LudiAction as Action, LegalAction as Legal, Participant } from "@doot-games/sdk/ludi";
export type { LudiMode, RuleEnvironment } from "@doot-games/sdk/ludi";
export type LudiAction = Action<{ choice?: number; value?: number }>;
export type LegalAction = Legal<{ choices?: number[]; range?: { min: number; max: number; step: number } }>;
export interface ChoiceRound { kind: "poll" | "guess"; prompt: string; options: string[] }
export interface SpectrumRound { kind: "spectrum"; prompt: string; leftLabel: string; rightLabel: string }
export type PublicRound = ChoiceRound | SpectrumRound;
export interface RoundReveal { duoScore?: number; counts?: number[]; correctIndex?: number; correctLabel?: string; mean?: number | null; marks?: number[] }
export interface RoundHistory { prompt: string; options?: string[]; leftLabel?: string; rightLabel?: string; reveal: RoundReveal }
export interface GameView {
  content?: PublicRound;
  ownChoice?: number;
  ownValue?: number;
  reveal?: RoundReveal;
  scores?: Array<Participant & { score: number }>;
  history?: RoundHistory[];
  actions: LegalAction[];
}
export type LudiView = View<GameView>;
export type LudiSession = Session<LudiView, LudiAction>;
