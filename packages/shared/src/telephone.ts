import { z } from 'zod';
import { GAME_LIMITS, StrokeSchema } from './game.js';

export const TelPagePromptSchema = z.object({
  type: z.literal('prompt'),
  text: z.string().min(1).max(GAME_LIMITS.telPromptMaxLen),
  authorId: z.string(),
});
export type TelPagePrompt = z.infer<typeof TelPagePromptSchema>;

export const TelPageDrawSchema = z.object({
  type: z.literal('draw'),
  strokes: z.array(StrokeSchema).max(GAME_LIMITS.telMaxStrokes),
  authorId: z.string(),
});
export type TelPageDraw = z.infer<typeof TelPageDrawSchema>;

export const TelPageCaptionSchema = z.object({
  type: z.literal('caption'),
  text: z.string().min(1).max(GAME_LIMITS.telCaptionMaxLen),
  authorId: z.string(),
});
export type TelPageCaption = z.infer<typeof TelPageCaptionSchema>;

export const TelPageSchema = z.discriminatedUnion('type', [
  TelPagePromptSchema,
  TelPageDrawSchema,
  TelPageCaptionSchema,
]);
export type TelPage = z.infer<typeof TelPageSchema>;

export const TelAssignmentSchema = z.object({
  bookId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  totalTurns: z.number().int().positive(),
  /** What action this player must take this turn. */
  action: z.enum(['prompt', 'draw', 'caption']),
  /** The previous page the player should respond to (null on the first turn). */
  previous: TelPageSchema.nullable(),
  endsAt: z.number(),
});
export type TelAssignment = z.infer<typeof TelAssignmentSchema>;

export const TelBookSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  ownerName: z.string(),
  ownerAvatar: z.string(),
  pages: z.array(TelPageSchema),
});
export type TelBook = z.infer<typeof TelBookSchema>;

export const TelRevealSchema = z.object({
  bookIndex: z.number().int().nonnegative(),
  totalBooks: z.number().int().positive(),
  pageIndex: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  book: TelBookSchema,
  endsAt: z.number(),
});
export type TelRevealPayload = z.infer<typeof TelRevealSchema>;

// ── Submission payloads (client → server) ──
export const SubmitPromptSchema = z.object({
  text: z.string().min(1).max(GAME_LIMITS.telPromptMaxLen),
});
export type SubmitPromptPayload = z.infer<typeof SubmitPromptSchema>;

export const SubmitDrawSchema = z.object({
  bookId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  strokes: z.array(StrokeSchema).max(GAME_LIMITS.telMaxStrokes),
});
export type SubmitDrawPayload = z.infer<typeof SubmitDrawSchema>;

export const SubmitCaptionSchema = z.object({
  bookId: z.string(),
  turnIndex: z.number().int().nonnegative(),
  text: z.string().min(1).max(GAME_LIMITS.telCaptionMaxLen),
});
export type SubmitCaptionPayload = z.infer<typeof SubmitCaptionSchema>;
