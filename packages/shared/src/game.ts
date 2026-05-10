import { z } from 'zod';

export const GAME_LIMITS = {
  minPlayers: 2,
  maxPlayers: 16,
  minRounds: 1,
  maxRounds: 10,
  minDrawTime: 30,
  maxDrawTime: 180,
  wordChoiceTime: 15,
  scoreboardTime: 6,
  gameEndTime: 12,
  hintMaxFraction: 0.5,
  roomCodeLength: 6,
  maxNameLength: 16,
  maxChatLength: 240,
  maxStrokesPerRound: 4000,
  maxStrokePoints: 1024,
} as const;

export const GameModeSchema = z.enum(['classic', 'teams', 'custom', 'speedrun']);
export type GameMode = z.infer<typeof GameModeSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const ThemeSchema = z.enum(['neo-dank', 'light', 'goblin']);
export type Theme = z.infer<typeof ThemeSchema>;

export const RoomConfigSchema = z.object({
  rounds: z.number().int().min(GAME_LIMITS.minRounds).max(GAME_LIMITS.maxRounds),
  drawTimeSec: z.number().int().min(GAME_LIMITS.minDrawTime).max(GAME_LIMITS.maxDrawTime),
  maxPlayers: z.number().int().min(GAME_LIMITS.minPlayers).max(GAME_LIMITS.maxPlayers),
  mode: GameModeSchema,
  language: z.enum(['en']).default('en'),
  customWords: z.array(z.string().min(1).max(40)).max(500).default([]),
  hintsEnabled: z.boolean().default(true),
  allowLateJoin: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
});
export type RoomConfig = z.infer<typeof RoomConfigSchema>;

export const DEFAULT_CONFIG: RoomConfig = {
  rounds: 3,
  drawTimeSec: 80,
  maxPlayers: 8,
  mode: 'classic',
  language: 'en',
  customWords: [],
  hintsEnabled: true,
  allowLateJoin: true,
  isPrivate: false,
};

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(GAME_LIMITS.maxNameLength),
  avatar: z.string(),
  color: z.string(),
  score: z.number().int().nonnegative(),
  roundScore: z.number().int(),
  hasGuessed: z.boolean(),
  isHost: z.boolean(),
  isDrawing: z.boolean(),
  isConnected: z.boolean(),
  joinedAt: z.number(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const PhaseSchema = z.enum([
  'lobby',
  'wordChoice',
  'drawing',
  'roundEnd',
  'gameEnd',
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const PointSchema = z.tuple([z.number(), z.number(), z.number().min(0).max(1)]);
export type StrokePoint = z.infer<typeof PointSchema>;

export const ToolSchema = z.enum(['pen', 'marker', 'eraser', 'fill', 'rect', 'ellipse']);
export type Tool = z.infer<typeof ToolSchema>;

export const StrokeSchema = z.object({
  id: z.string(),
  tool: ToolSchema,
  color: z.string(),
  size: z.number().min(1).max(80),
  points: z.array(PointSchema).min(1).max(GAME_LIMITS.maxStrokePoints),
});
export type Stroke = z.infer<typeof StrokeSchema>;

export const ChatKindSchema = z.enum([
  'guess',
  'close',
  'correct',
  'system',
  'host',
  'player',
]);
export type ChatKind = z.infer<typeof ChatKindSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  ts: z.number(),
  kind: ChatKindSchema,
  authorId: z.string().nullable(),
  authorName: z.string().nullable(),
  text: z.string().max(GAME_LIMITS.maxChatLength),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const PublicGameStateSchema = z.object({
  roomCode: z.string(),
  hostId: z.string(),
  config: RoomConfigSchema,
  players: z.array(PlayerSchema),
  phase: PhaseSchema,
  round: z.number().int().nonnegative(),
  totalRounds: z.number().int().positive(),
  drawerId: z.string().nullable(),
  wordMask: z.string().nullable(),
  wordReveal: z.string().nullable(),
  phaseEndsAt: z.number().nullable(),
});
export type PublicGameState = z.infer<typeof PublicGameStateSchema>;

export const PRESET_AVATARS = [
  '🦊', '🐸', '🐼', '🐙', '🦄', '🐲', '🐵', '🦖',
  '👻', '👽', '🤖', '🧙', '🧛', '🧟', '🐳', '🦋',
] as const;

export const PRESET_COLORS = [
  '#FF6BD6', '#A8FFE4', '#FFE066', '#7CC4FF',
  '#C8B0FF', '#FFAB76', '#9DFFB6', '#FF7676',
  '#76E1FF', '#FFD0F4', '#B8FFD9', '#FFB6F1',
] as const;
