import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Theme } from '@dankdraw/shared';
import { useSettings } from '@/store/settingsStore';
import { setSfxMuted, setSfxVolume, sfx } from '@/lib/sfx';

const THEMES: Array<{ id: Theme; label: string; swatches: string[] }> = [
  { id: 'neo-dank', label: 'Neo-Dank', swatches: ['#0E0B1F', '#FF6BD6', '#A8FFE4'] },
  { id: 'light', label: 'Light', swatches: ['#FFF8F3', '#D63BB0', '#00B88A'] },
  { id: 'goblin', label: 'Goblin', swatches: ['#0D1500', '#C8FF00', '#FF5FA0'] },
];

/** Floating settings popover, triggered from the room header. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const settings = useSettings();

  // Apply theme via root html class.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-neo-dank', 'theme-light', 'theme-goblin');
    html.classList.add(`theme-${settings.theme}`);
  }, [settings.theme]);

  useEffect(() => {
    setSfxMuted(!settings.soundOn);
    setSfxVolume(settings.volume);
  }, [settings.soundOn, settings.volume]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost h-9 px-3 text-sm"
        aria-label="settings"
      >
        ⚙ Settings
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="panel z-popover absolute right-0 top-12 w-[min(20rem,calc(100vw-1.5rem))] p-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-white/60">Theme</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    settings.setTheme(t.id);
                    sfx.click();
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition ${
                    settings.theme === t.id
                      ? 'border-dank-pink bg-dank-pink/15 shadow-glow'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex h-6 w-full overflow-hidden rounded-md">
                    {t.swatches.map((s, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: s }} />
                    ))}
                  </div>
                  <div className="text-xs">{t.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-white/60">
              Audio
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm">Sound effects</span>
              <Toggle value={settings.soundOn} onChange={settings.setSoundOn} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-white/60">Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) => settings.setVolume(Number(e.target.value))}
                className="dank-range h-2 flex-1"
                disabled={!settings.soundOn}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm">Reduce motion</span>
              <Toggle value={settings.reduceMotion} onChange={settings.setReduceMotion} />
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-white/40">
              keyboard: B / M / E / F · [ ] size · Ctrl+Z undo
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex h-5 w-9 items-center rounded-full transition ${
        value ? 'bg-dank-mint/60' : 'bg-white/15'
      }`}
      aria-pressed={value}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition ${value ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  );
}
