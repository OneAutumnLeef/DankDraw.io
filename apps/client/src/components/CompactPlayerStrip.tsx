import type { Player } from '@dankdraw/shared';
import clsx from 'clsx';
import { useGame } from '@/store/gameStore';

/**
 * Horizontal-scrolling compact player chips for mobile (where a vertical
 * player aside would eat half the viewport). Each chip shows avatar, name,
 * and score with role badges overlaid.
 */
export function CompactPlayerStrip({ players }: { players: Player[] }) {
  const selfId = useGame((s) => s.selfId);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {sorted.map((p) => (
        <div
          key={p.id}
          className={clsx(
            'flex shrink-0 items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-sm transition',
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
            className="relative flex h-7 w-7 items-center justify-center rounded-lg text-base"
            style={{ backgroundColor: p.color + '40', boxShadow: `inset 0 0 0 2px ${p.color}` }}
          >
            {p.avatar}
            {p.isHost && (
              <span className="absolute -right-1 -top-1 text-[10px] leading-none">👑</span>
            )}
            {p.isDrawing && (
              <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">✏️</span>
            )}
          </div>
          <div className="leading-tight">
            <div className="max-w-[6rem] truncate font-semibold">
              {p.name}
              {p.id === selfId && <span className="ml-1 text-[10px] text-white/50">(you)</span>}
            </div>
            <div className="text-[10px] text-white/60">
              {p.score} pts
              {p.roundScore > 0 && (
                <span className="ml-1 text-dank-mint">+{p.roundScore}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
