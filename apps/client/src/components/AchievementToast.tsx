import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Unlock {
  id: string;
  name: string;
  desc: string;
  icon: string;
  ts: number;
}

let push: ((u: Unlock) => void) | null = null;

export function pushAchievement(a: { id: string; name: string; desc: string; icon: string }) {
  push?.({ ...a, ts: Date.now() });
}

export function AchievementToastLayer() {
  const [items, setItems] = useState<Unlock[]>([]);

  useEffect(() => {
    push = (u) => {
      setItems((prev) => [...prev, u]);
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.85, x: 0.85 },
        colors: ['#FFE066', '#FF6BD6', '#A8FFE4'],
        scalar: 0.9,
      });
      setTimeout(() => setItems((prev) => prev.filter((x) => x.ts !== u.ts)), 4500);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {items.map((u) => (
          <motion.div
            key={u.ts}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="pointer-events-auto flex w-72 items-center gap-3 rounded-3xl border border-dank-sun/50 bg-gradient-to-br from-dank-sun/15 via-ink-800/95 to-ink-900/95 p-4 shadow-glow backdrop-blur-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dank-sun/20 text-2xl shadow-inset">
              {u.icon}
            </div>
            <div className="flex-1 leading-tight">
              <div className="text-[10px] uppercase tracking-widest text-dank-sun">
                Achievement Unlocked
              </div>
              <div className="font-display text-lg text-white">{u.name}</div>
              <div className="text-xs text-white/60">{u.desc}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
