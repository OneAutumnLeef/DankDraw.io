import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@dankdraw/shared';

export interface SettingsState {
  theme: Theme;
  soundOn: boolean;
  musicOn: boolean;
  volume: number; // 0–1
  reduceMotion: boolean;
  setTheme: (t: Theme) => void;
  setSoundOn: (b: boolean) => void;
  setMusicOn: (b: boolean) => void;
  setVolume: (v: number) => void;
  setReduceMotion: (b: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'neo-dank',
      soundOn: true,
      musicOn: false,
      volume: 0.6,
      reduceMotion: false,
      setTheme: (t) => set({ theme: t }),
      setSoundOn: (b) => set({ soundOn: b }),
      setMusicOn: (b) => set({ musicOn: b }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setReduceMotion: (b) => set({ reduceMotion: b }),
    }),
    { name: 'dankdraw-settings' },
  ),
);
