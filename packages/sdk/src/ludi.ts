/** Game Contract v0.2. Pure, serializable boundary; never exports authority state. */
import { z } from "zod";
export { z };
export type LudiMode = "solo" | "same-device" | "room";
export type LudiSurface = "primary" | "participant";
export type LudiVibe = "chill" | "funny" | "competitive" | "conversation" | "thinking";
export interface ModeSpec {
  mode: LudiMode;
  execution: "local" | "remote";
  players: { min: number; max: number };
  duration: { min: number; typical: number; max: number };
}
export interface LudiManifest {
  id: string;
  name: string;
  version: "0.2.0";
  description: string;
  modes: ModeSpec[];
  vibes: LudiVibe[];
  capabilities: Array<"score" | "hidden-input" | "turn-order" | "reconnect">;
  access: {
    tier: "free" | "premium" | "pack";
    packId?: string;
    guestAccess: "included" | "individual";
  };
  contentBundle: { id: string; version: string; delivery: "local" | "server" };
}
export function requireMode(manifest: LudiManifest, mode: LudiMode): ModeSpec {
  const spec = manifest.modes.find((m) => m.mode === mode);
  if (!spec) throw new Error("Modo indisponível.");
  return spec;
}
export interface SessionContext {
  mode: LudiMode;
  execution: "local" | "remote";
  surface: LudiSurface;
  locale: "pt-PT";
  participantId: string;
  permissions: { control: boolean };
}
export const participantNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .refine(
    (name) => [...name].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
    "Nome inválido.",
  );
export const choiceSchema = z.object({ choice: z.number().int().nonnegative() }).strict();
export function validChoice(content: { options: unknown[] }, input: unknown): boolean {
  const parsed = choiceSchema.safeParse(input);
  return parsed.success && parsed.data.choice < content.options.length;
}
export const actionSchema = z
  .object({
    id: z
      .string()
      .min(8)
      .max(80)
      .regex(/^[\w-]+$/),
    match: z.number().int().positive(),
    round: z.number().int().nonnegative(),
    type: z.enum(["start", "answer", "reveal", "next", "finish", "replay", "ready"]),
    choice: z.number().int().nonnegative().optional(),
  })
  .strict();
export type LudiAction = z.infer<typeof actionSchema>;
export interface LegalAction {
  type: LudiAction["type"];
  label: string;
  choices?: number[];
}
export interface Participant {
  id: string;
  name: string;
}
export interface PublicRound {
  kind: "poll" | "guess";
  prompt: string;
  options: string[];
}
export interface RoundReveal {
  counts?: number[];
  correctIndex?: number;
  correctLabel?: string;
}
export interface LudiView {
  context: SessionContext;
  gameId: string;
  title: string;
  code?: string;
  expiresAt?: number;
  revision: number;
  match: number;
  /** Room is the ephemeral execution context; match increments on replay.
   * A future persistent Party is a separate social entity, not this room. */
  phase: "lobby" | "active" | "results";
  round: number;
  totalRounds: number;
  roundState: "ready" | "open" | "locked" | "reveal";
  players: Participant[];
  handoff?: { name: string };
  content?: PublicRound;
  ownChoice?: number;
  reveal?: RoundReveal;
  scores?: Array<Participant & { score: number }>;
  history?: Array<{ prompt: string; options: string[]; reveal: RoundReveal }>;
  actions: LegalAction[];
}
/** Implementations deliver snapshots from playerView, never the full authority. */
export interface LudiSession {
  observe(listener: (view: LudiView) => void): () => void;
  availableActions(): LegalAction[];
  send(action: LudiAction): Promise<void>;
  disconnect(): void;
}
export interface RuleEnvironment {
  now: () => number;
  random: () => number;
}
