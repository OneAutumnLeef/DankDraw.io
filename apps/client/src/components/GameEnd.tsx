import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGame } from '@/store/gameStore';

export function GameEnd() {
  const state = useGame((s) => s.state)!;

  useEffect(() => {
    const end = Date.now() + 1800;
    const burst = () => {
      if (Date.now() > end) return;
      confetti({
        particleCount: 5,
        spread: 70,
        origin: { y: 0.4, x: Math.random() },
        colors: ['#FF6BD6', '#A8FFE4', '#FFE066', '#7CC4FF', '#C8B0FF'],
        scalar: 1.1,
      });
      requestAnimationFrame(burst);
    };
    burst();
  }, []);

  const podium = [...state.players].sort((a, b) => b.score - a.score);
  const top3 = podium.slice(0, 3);
  const rest = podium.slice(3);

  const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd → visual ordering

  const teamScores = state.teamScores;
  const teamWinner =
    teamScores && teamScores.red !== teamScores.blue
      ? teamScores.red > teamScores.blue
        ? 'red'
        : 'blue'
      : null;

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-3 sm:p-8">
      <div className="panel w-full max-w-2xl p-4 text-center sm:p-8">
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="title-chrome font-display text-3xl sm:text-4xl"
        >
          GG
        </motion.h2>

        {teamScores && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            <div
              className={`rounded-2xl border p-3 ${
                teamWinner === 'red'
                  ? 'border-dank-coral bg-dank-coral/15 shadow-glow'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-xs uppercase tracking-widest text-dank-coral">🔴 Red</div>
              <div className="font-display text-2xl">{teamScores.red}</div>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                teamWinner === 'blue'
                  ? 'border-dank-sky bg-dank-sky/15 shadow-glow'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-xs uppercase tracking-widest text-dank-sky">🔵 Blue</div>
              <div className="font-display text-2xl">{teamScores.blue}</div>
            </div>
            {teamWinner && (
              <div className="col-span-2 -mt-1 text-sm text-white/70">
                Team {teamWinner === 'red' ? '🔴 Red' : '🔵 Blue'} wins!
              </div>
            )}
          </motion.div>
        )}

        <div className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-3">
          {PODIUM_ORDER.map((rank, idx) => {
            const p = top3[rank];
            if (!p) return <div key={idx} />;
            const heights = ['h-16 sm:h-20', 'h-24 sm:h-32', 'h-12 sm:h-14'];
            const bg = ['bg-white/10', 'bg-dank-sun/30', 'bg-white/5'];
            return (
              <motion.div
                key={p.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.15 }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl sm:text-5xl">{p.avatar}</div>
                <div className="mt-1 max-w-full truncate text-sm font-bold sm:text-base">
                  {p.name}
                </div>
                <div className="text-xs text-white/60 sm:text-sm">{p.score} pts</div>
                <div
                  className={`mt-2 w-full rounded-t-xl ${heights[idx]} ${bg[idx]} flex items-start justify-center pt-2 font-display text-lg sm:text-xl`}
                >
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
                </div>
              </motion.div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <div className="mt-6 space-y-1 text-left">
            {rest.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white/40">#{i + 4}</span>
                  <span>{p.avatar}</span>
                  <span>{p.name}</span>
                </div>
                <div className="text-white/60">{p.score}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-sm text-white/50">returning to lobby…</div>
      </div>
    </div>
  );
}
