import {
  PRESET_AVATARS,
  PRESET_COLORS,
  type ChatMessage,
  type PublicGameState,
  type Stroke,
} from '@dankdraw/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProfileState {
  name: string;
  avatar: string;
  color: string;
  setProfile: (p: Partial<Pick<ProfileState, 'name' | 'avatar' | 'color'>>) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      name: '',
      avatar: PRESET_AVATARS[0],
      color: PRESET_COLORS[0],
      setProfile: (p) => set((s) => ({ ...s, ...p })),
    }),
    { name: 'dankdraw-profile' },
  ),
);

export interface GameStoreState {
  selfId: string | null;
  state: PublicGameState | null;
  chat: ChatMessage[];
  strokes: Stroke[];
  liveStrokes: Map<string, Stroke>;
  /** Word the drawer was assigned (only present for drawer). */
  myWord: string | null;
  /** Choices for the drawer to pick from. */
  wordChoices: { words: string[]; endsAt: number } | null;
  reactions: { id: string; fromId: string; emoji: string; ts: number }[];
  setRoomJoined: (p: {
    selfId: string;
    state: PublicGameState;
    recentChat: ChatMessage[];
    strokes: Stroke[];
  }) => void;
  setState: (s: PublicGameState) => void;
  pushChat: (m: ChatMessage) => void;
  setMyWord: (w: string | null) => void;
  setWordChoices: (c: { words: string[]; endsAt: number } | null) => void;
  addReaction: (fromId: string, emoji: string) => void;
  clearReaction: (id: string) => void;
  // Stroke management
  upsertStrokeStart: (s: Stroke) => void;
  appendToStroke: (id: string, points: [number, number, number][]) => void;
  finishStroke: (id: string) => void;
  removeStroke: (id: string) => void;
  clearStrokes: () => void;
  resetGameSession: () => void;
}

export const useGame = create<GameStoreState>((set) => ({
  selfId: null,
  state: null,
  chat: [],
  strokes: [],
  liveStrokes: new Map(),
  myWord: null,
  wordChoices: null,
  reactions: [],

  setRoomJoined: ({ selfId, state, recentChat, strokes }) =>
    set({
      selfId,
      state,
      chat: recentChat,
      strokes,
      liveStrokes: new Map(),
      myWord: null,
      wordChoices: null,
      reactions: [],
    }),
  setState: (state) => set({ state }),
  pushChat: (m) =>
    set((s) => ({ chat: [...s.chat.slice(-199), m] })),
  setMyWord: (w) => set({ myWord: w }),
  setWordChoices: (c) => set({ wordChoices: c }),

  addReaction: (fromId, emoji) =>
    set((s) => ({
      reactions: [
        ...s.reactions,
        { id: Math.random().toString(36).slice(2), fromId, emoji, ts: Date.now() },
      ],
    })),
  clearReaction: (id) => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),

  upsertStrokeStart: (stroke) =>
    set((s) => {
      const live = new Map(s.liveStrokes);
      live.set(stroke.id, stroke);
      return { liveStrokes: live };
    }),
  appendToStroke: (id, points) =>
    set((s) => {
      const live = new Map(s.liveStrokes);
      const existing = live.get(id);
      if (!existing) return s;
      live.set(id, { ...existing, points: [...existing.points, ...points] });
      return { liveStrokes: live };
    }),
  finishStroke: (id) =>
    set((s) => {
      const live = new Map(s.liveStrokes);
      const stroke = live.get(id);
      if (!stroke) return s;
      live.delete(id);
      return { liveStrokes: live, strokes: [...s.strokes, stroke] };
    }),
  removeStroke: (id) =>
    set((s) => {
      const live = new Map(s.liveStrokes);
      live.delete(id);
      return {
        liveStrokes: live,
        strokes: s.strokes.filter((st) => st.id !== id),
      };
    }),
  clearStrokes: () => set({ strokes: [], liveStrokes: new Map() }),

  resetGameSession: () =>
    set({
      selfId: null,
      state: null,
      chat: [],
      strokes: [],
      liveStrokes: new Map(),
      myWord: null,
      wordChoices: null,
      reactions: [],
    }),
}));
