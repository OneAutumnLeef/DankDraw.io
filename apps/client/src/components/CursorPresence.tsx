import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, type RefObject } from 'react';
import { useGame } from '@/store/gameStore';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>;
  virtualW: number;
  virtualH: number;
}

/** Renders other players' floating cursors over the canvas. */
export function CursorPresence({ canvasRef, virtualW, virtualH }: Props) {
  const cursors = useGame((s) => s.cursors);
  const players = useGame((s) => s.state?.players ?? []);
  const selfId = useGame((s) => s.selfId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 800);
    return () => clearInterval(id);
  }, []);

  const c = canvasRef.current;
  if (!c) return null;
  const rect = c.getBoundingClientRect();
  const parentRect = c.parentElement?.getBoundingClientRect();
  if (!parentRect) return null;
  const offsetX = rect.left - parentRect.left;
  const offsetY = rect.top - parentRect.top;
  const sx = rect.width / virtualW;
  const sy = rect.height / virtualH;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {[...cursors.entries()]
          .filter(([id, c]) => id !== selfId && now - c.ts < 4000)
          .map(([id, c]) => {
            const p = players.find((pl) => pl.id === id);
            if (!p) return null;
            const x = offsetX + c.x * sx;
            const y = offsetY + c.y * sy;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 700, damping: 40, opacity: { duration: 0.15 } }}
                className="absolute left-0 top-0 -translate-x-1 -translate-y-1"
                style={{ color: p.color }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
                >
                  <path d="M2 2 L18 9 L9 11 L7 18 Z" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
                </svg>
                <div
                  className="ml-3 -mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-soft"
                  style={{ backgroundColor: p.color }}
                >
                  {p.avatar} {p.name}
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
