import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { useSettings } from '@/store/settingsStore';

/**
 * 36-swatch palette covering neutrals, saturated rainbow, pastels and deeps.
 * Six rows of six so it lays out cleanly in the popover.
 */
const PALETTE: string[] = [
  // Neutrals
  '#000000', '#404040', '#808080', '#BFBFBF', '#FFFFFF', '#0E0B1F',
  // Saturated rainbow
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE',
  // Brand-like dank tones
  '#FF6BD6', '#FF7676', '#FFAB76', '#FFE066', '#9DFFB6', '#7CC4FF',
  // Pastels
  '#FFB3CC', '#FFC8B3', '#FFE5A3', '#A8FFE4', '#80B5FF', '#C8B0FF',
  // Earth
  '#A2845E', '#8B5A2B', '#5C3A1E', '#2E5D2A', '#1F4E5F', '#3A2D6B',
  // Deep & jewel
  '#7A0A05', '#A55F00', '#5C5500', '#0E5C2A', '#001F66', '#2E0A4D',
];

interface Props {
  color: string;
  onChange: (hex: string) => void;
  /** Called when a color is "committed" (closed picker / palette click). */
  onCommit?: (hex: string) => void;
  className?: string;
}

/**
 * Inline current-color button that pops a full color picker:
 *   - HSV surface + hue strip (react-colorful)
 *   - Hex input
 *   - Recent colors (persisted in settingsStore)
 *   - Curated 36-swatch palette
 */
export function ColorPicker({ color, onChange, onCommit, className }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const recents = useSettings((s) => s.recentColors);
  const pushRecent = useSettings((s) => s.pushRecentColor);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (hex: string) => {
    onChange(hex);
    onCommit?.(hex);
    pushRecent(hex);
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white/15 transition hover:scale-105 sm:h-10 sm:w-10"
        style={{ backgroundColor: color }}
        aria-label="open color picker"
        aria-expanded={open}
        title={`color: ${color.toUpperCase()}`}
      >
        <span className="text-xs mix-blend-difference text-white">🎨</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="dank-color-picker absolute left-1/2 top-12 z-30 w-[15rem] -translate-x-1/2 rounded-3xl border border-white/15 bg-ink-900 p-3 shadow-glow"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <HexColorPicker
              color={color}
              onChange={onChange}
              onMouseUp={() => pushRecent(color)}
              onTouchEnd={() => pushRecent(color)}
              style={{ width: '100%', height: '11rem' }}
            />

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/40">Hex</span>
              <HexColorInput
                color={color}
                onChange={commit}
                prefixed
                className="input h-8 flex-1 px-2 py-1 text-sm font-mono"
              />
            </div>

            {recents.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Recent
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {recents.slice(0, 12).map((c) => (
                    <Swatch
                      key={`recent-${c}`}
                      color={c}
                      selected={c.toUpperCase() === color.toUpperCase()}
                      onClick={() => commit(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Palette
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {PALETTE.map((c) => (
                  <Swatch
                    key={`palette-${c}`}
                    color={c}
                    selected={c.toUpperCase() === color.toUpperCase()}
                    onClick={() => commit(c)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Swatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 w-7 rounded-lg border-2 transition hover:scale-110 ${
        selected ? 'border-white scale-110' : 'border-black/30'
      }`}
      style={{ backgroundColor: color }}
      title={color.toUpperCase()}
      aria-label={`color ${color}`}
    />
  );
}
