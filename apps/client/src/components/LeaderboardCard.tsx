import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  name: string;
  avatar: string;
  score: number;
  games: number;
  wins: number;
}

export function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/leaderboard?days=7')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setEntries(data.entries ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="panel w-full max-w-md p-5"
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-xl text-white">🏆 Top Doodlers</h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40">last 7 days</span>
      </div>

      {error && <div className="text-sm text-dank-coral">couldn't load leaderboard</div>}
      {!error && entries === null && (
        <div className="text-sm text-white/40">loading…</div>
      )}
      {!error && entries && entries.length === 0 && (
        <div className="text-sm text-white/40">no games yet — be the first!</div>
      )}
      {!error && entries && entries.length > 0 && (
        <div className="space-y-1">
          {entries.slice(0, 5).map((e, i) => (
            <div
              key={`${e.name}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="w-6 text-center font-mono text-xs text-white/40">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="text-xl">{e.avatar}</div>
              <div className="flex-1 truncate text-sm font-semibold">{e.name}</div>
              <div className="text-right text-xs leading-tight">
                <div className="font-display text-base text-dank-mint">{e.score}</div>
                <div className="text-[10px] text-white/40">
                  {e.wins}/{e.games} W
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
