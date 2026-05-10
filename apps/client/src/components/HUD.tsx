import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '@/store/gameStore';

export function HUD() {
  const state = useGame((s) => s.state)!;
  const myWord = useGame((s) => s.myWord);
  const selfId = useGame((s) => s.selfId);
  const drawer = state.players.find((p) => p.id === state.drawerId);
  const isDrawer = drawer?.id === selfId;

  const remaining = useCountdown(state.phaseEndsAt);

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-ink-800/80 p-3 px-4 shadow-soft backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs text-white/60">
        <span className="chip border-dank-pink/30 bg-dank-pink/10 text-dank-pink">
          Round {state.round}/{state.totalRounds}
        </span>
        {drawer && (
          <span className="hidden sm:inline">
            <span className="text-white/40">drawer:</span>{' '}
            <span className="font-semibold text-white">
              {drawer.avatar} {drawer.name}
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center">
        {state.phase === 'drawing' && (
          <WordHint
            isDrawer={isDrawer}
            mask={state.wordMask ?? ''}
            myWord={myWord ?? null}
          />
        )}
      </div>

      <CountdownPill seconds={remaining} />
    </div>
  );
}

function WordHint({
  isDrawer,
  mask,
  myWord,
}: {
  isDrawer: boolean;
  mask: string;
  myWord: string | null;
}) {
  if (isDrawer && myWord) {
    return (
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-white/40">your word</div>
        <div className="font-display text-2xl tracking-wider text-dank-mint">{myWord}</div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40">guess the word</div>
      <div className="font-mono text-2xl tracking-[0.5em] text-white">{mask}</div>
    </div>
  );
}

function CountdownPill({ seconds }: { seconds: number }) {
  const danger = seconds <= 10;
  return (
    <motion.div
      animate={danger ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.6, repeat: danger ? Infinity : 0 }}
      className={`min-w-[70px] rounded-2xl border px-3 py-2 text-center font-display text-2xl ${
        danger
          ? 'border-dank-coral/60 bg-dank-coral/15 text-dank-coral'
          : 'border-white/10 bg-white/5 text-white'
      }`}
    >
      {seconds}s
    </motion.div>
  );
}

function useCountdown(endsAt: number | null): number {
  const [_, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}
