import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, type RefObject } from 'react';
import { useGame } from '@/store/gameStore';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>;
}

/**
 * Floating emote reactions that drift upward across the canvas.
 * Spawn position is random along the bottom edge.
 */
export function ReactionLayer({ canvasRef }: Props) {
  const reactions = useGame((s) => s.reactions);
  const clearReaction = useGame((s) => s.clearReaction);

  useEffect(() => {
    if (reactions.length === 0) return;
    const expiry = setInterval(() => {
      const cutoff = Date.now() - 2200;
      for (const r of reactions) if (r.ts < cutoff) clearReaction(r.id);
    }, 400);
    return () => clearInterval(expiry);
  }, [reactions, clearReaction]);

  const rect = canvasRef.current?.getBoundingClientRect();
  const parentRect = canvasRef.current?.parentElement?.getBoundingClientRect();
  if (!rect || !parentRect) return null;
  const offsetX = rect.left - parentRect.left;
  const offsetY = rect.top - parentRect.top;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          const x = offsetX + Math.random() * rect.width * 0.8 + rect.width * 0.1;
          const y = offsetY + rect.height - 40;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.4, x, y }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1.3, 1, 0.9],
                x: x + (Math.random() - 0.5) * 80,
                y: y - rect.height * 0.7,
              }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute left-0 top-0 select-none text-5xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
            >
              {r.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
