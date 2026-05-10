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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-3xl border border-white/10 bg-ink-800 p-2 px-3 shadow-soft sm:p-3 sm:px-4">
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

      <CountdownPill seconds={remaining} />

      {/* Word/hint row — always full-width on mobile, between flex items on desktop. */}
      {state.phase === 'drawing' && (
        <div className="order-last flex w-full items-center justify-center sm:order-none sm:w-auto sm:flex-1">
          <WordHint
            isDrawer={isDrawer}
            mask={state.wordMask ?? ''}
            myWord={myWord ?? null}
          />
        </div>
      )}
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
        <div className="break-words font-display text-xl tracking-wider text-dank-mint sm:text-2xl">
          {myWord}
        </div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40">guess the word</div>
      <div className="break-words font-mono text-xl tracking-[0.4em] text-white sm:text-2xl sm:tracking-[0.5em]">
        {mask}
      </div>
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
