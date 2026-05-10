import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

const EMOJIS = ['👍', '😂', '🔥', '💀', '🤯', '👀'] as const;

/** A small hovering bar of emoji-reaction buttons. Anyone in the room can spam them. */
export function ReactionBar() {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 200);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = (emoji: (typeof EMOJIS)[number]) => {
    if (cooldown > 0) return;
    setCooldown(2);
    getSocket().emit('reaction', { emoji });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-ink-800/80 px-2 py-1 shadow-soft backdrop-blur-xl"
    >
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => send(e)}
          className="rounded-full px-2 py-1 text-xl transition hover:scale-110 hover:bg-white/10 active:scale-95"
          aria-label={`react ${e}`}
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}
