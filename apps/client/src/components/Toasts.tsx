import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

let push: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function toast(text: string, kind: Toast['kind'] = 'info') {
  push?.({ text, kind });
}

export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    push = ({ text, kind }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, text, kind }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="pointer-events-none z-toast fixed left-1/2 top-4 -translate-x-1/2 flex w-[min(28rem,calc(100vw-1.5rem))] flex-col items-center gap-2 sm:top-auto sm:bottom-6">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto rounded-2xl border px-4 py-2 text-sm font-semibold shadow-soft backdrop-blur-xl ${
              t.kind === 'error'
                ? 'border-dank-coral/40 bg-dank-coral/15 text-dank-coral'
                : t.kind === 'success'
                ? 'border-dank-mint/40 bg-dank-mint/15 text-dank-mint'
                : 'border-white/10 bg-ink-800/80 text-white'
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
