/** Concrete wire contracts belong to games, not the SDK/session core. */
import type { LudiView as View, LudiSession as Session, LudiAction as Action, LegalAction as Legal, Participant } from "@doot-games/sdk/ludi";
export type { LudiMode, RuleEnvironment } from "@doot-games/sdk/ludi";
export type LudiAction = Action<{ choice?: number; value?: number; stage?: string }>;
export type LegalAction = Legal<{ stage?: string; choices?: number[]; range?: { min: number; max: number; step: number } }>;
export interface RoundPresentation { momentType?: string; targetName?: string; social?: boolean }
export interface ChoiceRound extends RoundPresentation { kind: "poll" | "guess"; prompt: string; options: string[] }
export interface SpectrumRound { kind: "spectrum"; prompt: string; leftLabel: string; rightLabel: string }
export interface ConversationRound extends RoundPresentation { kind: "conversation"; prompt: string }
export type PublicRound = ChoiceRound | SpectrumRound | ConversationRound;
export interface RoundReveal { attempts?: number; skipped?: number; targetSkipped?: boolean; authorName?: string; matches?: number; predictions?: number; duoScore?: number; counts?: number[]; correctIndex?: number; correctLabel?: string; mean?: number | null; marks?: number[] }
export interface RoundHistory { momentType?: string; customId?: string; prompt: string; options?: string[]; leftLabel?: string; rightLabel?: string; reveal: RoundReveal }
export interface GameView {
  ticTacToe?: { board: import('./tic-tac-toe/rules').Cell[]; turn: string; outcome: import('./tic-tac-toe/rules').Mark | 'draw' | null; draws: number };
  capacity?: { min: number; max: number };
  content?: PublicRound;
  stage?: string;
  skipped?: boolean;
  preparation?: PreparationView;
  summary?: SocialSummary;
  ownChoice?: number;
  ownValue?: number;
  reveal?: RoundReveal;
  scores?: Array<Participant & { score: number }>;
  history?: RoundHistory[];
  actions: LegalAction[];
}
export type LudiView = Omit<View<GameView>, 'actions'> & { actions: LegalAction[] };
export type LudiSession = Session<LudiView, LudiAction> & { prepare?: (action: PreparationAction) => Promise<void> };

export type SessionRelationship = 'strangers' | 'friends' | 'couple' | 'group' | 'close' | 'random';
export type SocialMode = 'entre-nos' | 'quem-me-conhece';
export interface SocialConfig { context: SessionRelationship; mode: SocialMode }
export interface OwnQuestion { id: string; prompt: string; options: string[]; correctIndex: number; status: 'draft' | 'submitted' | 'used' }
export interface PreparationView {
  step: 'lobby' | 'context' | 'mode' | 'questions';
  config: SocialConfig | null;
  context?: SessionRelationship;
  progress: Array<{ playerId: string; count: number; ready: boolean }>;
  ownQuestions: OwnQuestion[];
  limit: number;
}
export interface SocialSummary { inTune: number; divided: number; predictions: number; correctPredictions: number; customUsed: number; customAttempts: number; customMatches: number; customRemaining: number; skipped: number }
export interface PreparationAction { id: string; revision: number; type: 'advance' | 'context' | 'mode' | 'back' | 'save-question' | 'delete-question' | 'readiness' | 'configure-again'; context?: SessionRelationship; mode?: SocialMode; question?: Omit<OwnQuestion, 'status'> & { status: 'draft' | 'submitted' }; questionId?: string; ready?: boolean }
