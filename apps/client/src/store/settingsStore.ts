import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@dankdraw/shared';

export interface SettingsState {
  theme: Theme;
  soundOn: boolean;
  musicOn: boolean;
  volume: number; // 0–1
  reduceMotion: boolean;
  /** Most-recently picked drawing colors (newest first), capped at 12. */
  recentColors: string[];
  setTheme: (t: Theme) => void;
  setSoundOn: (b: boolean) => void;
  setMusicOn: (b: boolean) => void;
  setVolume: (v: number) => void;
  setReduceMotion: (b: boolean) => void;
  pushRecentColor: (hex: string) => void;
}

const RECENT_COLORS_MAX = 12;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'neo-dank',
      soundOn: true,
      musicOn: false,
      volume: 0.6,
      reduceMotion: false,
      recentColors: [],
      setTheme: (t) => set({ theme: t }),
      setSoundOn: (b) => set({ soundOn: b }),
      setMusicOn: (b) => set({ musicOn: b }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setReduceMotion: (b) => set({ reduceMotion: b }),
      pushRecentColor: (hex) =>
        set((s) => {
          const normalised = hex.toUpperCase();
          const next = [normalised, ...s.recentColors.filter((c) => c.toUpperCase() !== normalised)];
          return { recentColors: next.slice(0, RECENT_COLORS_MAX) };
        }),
    }),
    { name: 'dankdraw-settings', version: 2 },
  ),
);
