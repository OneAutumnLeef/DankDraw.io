import { z } from 'zod';
import {
  ChatMessageSchema,
  PublicGameStateSchema,
  RoomConfigSchema,
  StrokeSchema,
  TeamSchema,
  ToolSchema,
} from './game.js';
import {
  SubmitCaptionSchema,
  SubmitDrawSchema,
  SubmitPromptSchema,
  TelAssignmentSchema,
  TelRevealSchema,
} from './telephone.js';

// ─────────────────────────────────────────────────────────────────
// Client → Server payloads
// ─────────────────────────────────────────────────────────────────

export const HelloSchema = z.object({
  name: z.string().min(1).max(16),
  avatar: z.string().min(1).max(8),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  /** Stable client identity from localStorage. Used for cross-session stats + achievements. */
  clientId: z.string().min(8).max(64).optional(),
});
export type HelloPayload = z.infer<typeof HelloSchema>;

export const CreateRoomSchema = z.object({
  config: RoomConfigSchema.partial().optional(),
});
export type CreateRoomPayload = z.infer<typeof CreateRoomSchema>;

export const JoinRoomSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomSchema>;

export const UpdateConfigSchema = z.object({
  config: RoomConfigSchema.partial(),
});
export type UpdateConfigPayload = z.infer<typeof UpdateConfigSchema>;

export const ChatSendSchema = z.object({
  text: z.string().max(240).default(''),
  image: z.string().max(280_000).optional(),
});
export type ChatSendPayload = z.infer<typeof ChatSendSchema>;

export const StrokeStartSchema = z.object({
  id: z.string(),
  tool: ToolSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  size: z.number().min(1).max(80),
  point: z.tuple([z.number(), z.number(), z.number().min(0).max(1)]),
});
export type StrokeStartPayload = z.infer<typeof StrokeStartSchema>;

export const StrokeAppendSchema = z.object({
  id: z.string(),
  points: z.array(z.tuple([z.number(), z.number(), z.number().min(0).max(1)])).min(1).max(64),
});
export type StrokeAppendPayload = z.infer<typeof StrokeAppendSchema>;

export const StrokeEndSchema = z.object({ id: z.string() });
export type StrokeEndPayload = z.infer<typeof StrokeEndSchema>;

export const FillSchema = z.object({
  x: z.number(),
  y: z.number(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
export type FillPayload = z.infer<typeof FillSchema>;

export const PickWordSchema = z.object({
  index: z.number().int().min(0).max(2),
});
export type PickWordPayload = z.infer<typeof PickWordSchema>;

export const ReactionSchema = z.object({
  emoji: z.enum(['👍', '😂', '🔥', '💀', '🤯', '👀']),
});
export type ReactionPayload = z.infer<typeof ReactionSchema>;

export const KickSchema = z.object({
  playerId: z.string(),
});
export type KickPayload = z.infer<typeof KickSchema>;

export const CursorMoveSchema = z.object({
  x: z.number().min(-200).max(2000),
  y: z.number().min(-200).max(2000),
});
export type CursorMovePayload = z.infer<typeof CursorMoveSchema>;

export const TypingSchema = z.object({ typing: z.boolean() });
export type TypingPayload = z.infer<typeof TypingSchema>;

export const SetTeamSchema = z.object({
  playerId: z.string(),
  team: TeamSchema,
});
export type SetTeamPayload = z.infer<typeof SetTeamSchema>;

// ─────────────────────────────────────────────────────────────────
// Server → Client payloads
// ─────────────────────────────────────────────────────────────────

export const RoomJoinedSchema = z.object({
  selfId: z.string(),
  state: PublicGameStateSchema,
  recentChat: z.array(ChatMessageSchema),
  strokes: z.array(StrokeSchema),
});
export type RoomJoinedPayload = z.infer<typeof RoomJoinedSchema>;

export const WordChoicesSchema = z.object({
  words: z.array(z.string()).length(3),
  endsAt: z.number(),
});
export type WordChoicesPayload = z.infer<typeof WordChoicesSchema>;

export const RoundStartSchema = z.object({
  drawerId: z.string(),
  wordLength: z.number().int().positive(),
  wordMask: z.string(),
  endsAt: z.number(),
  /** Only sent to the drawer. */
  word: z.string().optional(),
});
export type RoundStartPayload = z.infer<typeof RoundStartSchema>;

export const RoundEndSchema = z.object({
  word: z.string(),
  perPlayer: z.array(
    z.object({ playerId: z.string(), gained: z.number().int(), guessed: z.boolean() }),
  ),
  endsAt: z.number(),
});
export type RoundEndPayload = z.infer<typeof RoundEndSchema>;

export const GameEndSchema = z.object({
  podium: z.array(
    z.object({ playerId: z.string(), score: z.number().int(), name: z.string(), avatar: z.string() }),
  ),
});
export type GameEndPayload = z.infer<typeof GameEndSchema>;

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorPayload = z.infer<typeof ErrorSchema>;

// ─────────────────────────────────────────────────────────────────
// Event registries (typed io for both sides)
// ─────────────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  hello: (p: HelloPayload, ack?: (r: { ok: boolean; error?: string }) => void) => void;
  'room:create': (
    p: CreateRoomPayload,
    ack?: (r: { ok: boolean; roomCode?: string; error?: string }) => void,
  ) => void;
  'room:join': (
    p: JoinRoomPayload,
    ack?: (r: { ok: boolean; error?: string }) => void,
  ) => void;
  'room:leave': () => void;
  'room:updateConfig': (p: UpdateConfigPayload) => void;
  'room:start': () => void;
  'room:kick': (p: KickPayload) => void;
  'room:setTeam': (p: SetTeamPayload) => void;

  'chat:send': (p: ChatSendPayload) => void;
  'chat:typing': (p: TypingPayload) => void;
  reaction: (p: ReactionPayload) => void;
  'cursor:move': (p: CursorMovePayload) => void;
  /** Lightweight RTT probe — server acks immediately. */
  ping: (ack: (serverTime: number) => void) => void;

  'word:pick': (p: PickWordPayload) => void;

  'phone:submitPrompt': (p: z.infer<typeof SubmitPromptSchema>) => void;
  'phone:submitDraw': (p: z.infer<typeof SubmitDrawSchema>) => void;
  'phone:submitCaption': (p: z.infer<typeof SubmitCaptionSchema>) => void;

  'stroke:start': (p: StrokeStartPayload) => void;
  'stroke:append': (p: StrokeAppendPayload) => void;
  'stroke:end': (p: StrokeEndPayload) => void;
  'stroke:undo': () => void;
  'canvas:clear': () => void;
  'canvas:fill': (p: FillPayload) => void;
}

export interface ServerToClientEvents {
  'room:joined': (p: RoomJoinedPayload) => void;
  'room:state': (p: z.infer<typeof PublicGameStateSchema>) => void;
  'word:choices': (p: WordChoicesPayload) => void;
  'round:start': (p: RoundStartPayload) => void;
  'round:hint': (p: { wordMask: string }) => void;
  'round:end': (p: RoundEndPayload) => void;
  'game:end': (p: GameEndPayload) => void;

  'chat:message': (p: z.infer<typeof ChatMessageSchema>) => void;
  'chat:typing': (p: { fromId: string; typing: boolean }) => void;
  reaction: (p: { fromId: string; emoji: string }) => void;
  'cursor:move': (p: { fromId: string; x: number; y: number }) => void;

  'stroke:start': (p: StrokeStartPayload & { fromId: string }) => void;
  'stroke:append': (p: StrokeAppendPayload & { fromId: string }) => void;
  'stroke:end': (p: StrokeEndPayload & { fromId: string }) => void;
  'stroke:undo': (p: { strokeId: string }) => void;
  'canvas:clear': () => void;
  'canvas:fill': (p: FillPayload & { fromId: string }) => void;

  'achievement:unlock': (p: { id: string; name: string; desc: string; icon: string }) => void;

  'phone:assignment': (p: z.infer<typeof TelAssignmentSchema>) => void;
  'phone:waiting': (p: { submitted: number; total: number }) => void;
  'phone:reveal': (p: z.infer<typeof TelRevealSchema>) => void;

  error: (p: ErrorPayload) => void;
}
