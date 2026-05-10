import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';

export function WordChoiceModal() {
  const choices = useGame((s) => s.wordChoices);
  const [secsLeft, setSecsLeft] = useState(0);

  useEffect(() => {
    if (!choices) return;
    const tick = () =>
      setSecsLeft(Math.max(0, Math.ceil((choices.endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [choices]);

  return (
    <AnimatePresence>
      {choices && (
        <motion.div
          className="z-modal fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="panel my-auto w-full max-w-2xl p-6 text-center sm:p-8"
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
          >
            <div className="text-xs uppercase tracking-widest text-white/50">It's your turn</div>
            <h2 className="mt-1 font-display text-2xl text-white sm:text-3xl">Pick a word to draw</h2>
            <div className="mt-2 text-sm text-white/60">{secsLeft}s — auto-pick if you wait</div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {choices.words.map((w, idx) => (
                <motion.button
                  key={w}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => getSocket().emit('word:pick', { index: idx })}
                  className="break-words rounded-3xl border border-white/15 bg-white/5 px-4 py-5 text-base font-display text-white transition hover:border-dank-pink hover:bg-dank-pink/10 hover:shadow-glow sm:text-lg"
                >
                  {w}
                </motion.button>
              ))}
            </div>

            <p className="mt-5 text-xs text-white/40">
              tip: harder words = more points if anyone guesses
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
