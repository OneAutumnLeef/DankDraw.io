import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { ReplayCanvas } from './ReplayCanvas';

export function RoundEnd() {
  const state = useGame((s) => s.state)!;
  const strokes = useGame((s) => s.strokes);

  return (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-y-auto p-3 sm:p-4 lg:p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel grid w-full max-w-5xl gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[2fr_1fr]"
      >
        <div className="flex flex-col gap-3">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-white/50">the word was</div>
            <div className="break-words font-display text-2xl text-dank-mint sm:text-3xl">
              {state.wordReveal}
            </div>
          </div>
          <ReplayCanvas strokes={strokes} />
        </div>

        <div className="flex flex-col">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
            this round
          </div>
          <div className="space-y-2">
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
                    <div className="leading-tight">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-[10px] text-white/40">{p.score} total</div>
                    </div>
                  </div>
                  <div
                    className={
                      p.roundScore > 0 ? 'font-display text-dank-mint' : 'text-white/40'
                    }
                  >
                    {p.roundScore > 0 ? `+${p.roundScore}` : '—'}
                  </div>
                </motion.div>
              ))}
          </div>
          <div className="mt-auto pt-4 text-center text-xs text-white/50">
            next round starting…
          </div>
        </div>
      </motion.div>
    </div>
  );
}
