import type { Player } from '@dankdraw/shared';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';

export function PlayerList({ players }: { players: Player[] }) {
  const selfId = useGame((s) => s.selfId);
  const state = useGame((s) => s.state);
  const isHost = selfId && state?.hostId === selfId;
  const inLobby = state?.phase === 'lobby';

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p, idx) => (
        <motion.div
          key={p.id}
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={clsx(
            'flex items-center gap-3 rounded-2xl border px-3 py-2 transition',
            p.isDrawing
              ? 'border-dank-mint/50 bg-dank-mint/10'
              : p.hasGuessed
              ? 'border-dank-sun/40 bg-dank-sun/10'
              : p.team === 'red'
              ? 'border-dank-coral/40 bg-dank-coral/5'
              : p.team === 'blue'
              ? 'border-dank-sky/40 bg-dank-sky/5'
              : 'border-white/10 bg-white/5',
            !p.isConnected && 'opacity-50',
          )}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: p.color + '40', boxShadow: `inset 0 0 0 2px ${p.color}` }}
          >
            {p.avatar}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 truncate font-semibold text-white">
              <span className="truncate">{p.name}</span>
              {p.id === selfId && <span className="text-[10px] text-white/50">(you)</span>}
              {p.isHost && <span className="text-[10px]">👑</span>}
              {p.isDrawing && <span className="text-[10px]">✏️</span>}
            </div>
            <div className="text-xs text-white/60">
              {p.score} pts
              {p.roundScore > 0 && (
                <span className="ml-1.5 text-dank-mint">+{p.roundScore}</span>
              )}
            </div>
          </div>
          <div className="font-mono text-xs text-white/40">#{idx + 1}</div>
          {isHost && inLobby && p.id !== selfId && (
            <button
              className="text-xs text-white/40 hover:text-dank-coral"
              onClick={() => getSocket().emit('room:kick', { playerId: p.id })}
              aria-label={`kick ${p.name}`}
              title="kick"
            >
              ✕
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
