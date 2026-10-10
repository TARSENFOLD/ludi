import { z } from "@doot-games/sdk/ludi";
import { promptText } from "@doot-games/sdk/schemas";
export const spectrumContentSchema = z.object({
  prompt: promptText('Pineapple on pizza'),
  leftLabel: z.string().min(1).default('Disgusting').describe('The left pole of the dial.'),
  rightLabel: z.string().min(1).default('Delicious').describe('The right pole of the dial.'),
  timer: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .default(30)
    .describe('Seconds to place your dial. Turn off for an untimed round.'),
})

export const spectrumInputSchema = z.object({ value: z.number().int().min(0).max(100) }).strict();
export { scoreSpectrum } from "./logic";
