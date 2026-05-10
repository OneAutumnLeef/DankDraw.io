import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';

export function RoundEnd() {
  const state = useGame((s) => s.state)!;
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel max-w-lg w-full p-8 text-center"
      >
        <div className="text-xs uppercase tracking-widest text-white/50">the word was</div>
        <div className="mt-1 font-display text-4xl text-dank-mint">{state.wordReveal}</div>

        <div className="mt-6 space-y-2 text-left">
          {state.players
            .slice()
            .sort((a, b) => b.roundScore - a.roundScore)
            .map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.avatar}</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <div
                  className={
                    p.roundScore > 0
                      ? 'font-display text-dank-mint'
                      : 'text-white/40'
                  }
                >
                  {p.roundScore > 0 ? `+${p.roundScore}` : '—'}
                </div>
              </motion.div>
            ))}
        </div>

        <div className="mt-5 text-xs text-white/50">next round starting…</div>
      </motion.div>
    </div>
  );
}
