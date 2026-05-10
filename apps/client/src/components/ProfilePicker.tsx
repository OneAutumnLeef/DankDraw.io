import { GAME_LIMITS, PRESET_AVATARS, PRESET_COLORS } from '@dankdraw/shared';
import { useProfile } from '@/store/gameStore';
import clsx from 'clsx';

export function ProfilePicker({ compact = false }: { compact?: boolean }) {
  const profile = useProfile();
  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <label className="text-xs font-bold uppercase tracking-wider text-white/60">Your name</label>
      )}
      <input
        className="input"
        placeholder="enter a name"
        maxLength={GAME_LIMITS.maxNameLength}
        value={profile.name}
        onChange={(e) => profile.setProfile({ name: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        {PRESET_AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => profile.setProfile({ avatar: a })}
            className={clsx(
              'h-11 w-11 rounded-2xl border text-2xl transition active:translate-y-px',
              profile.avatar === a
                ? 'border-dank-pink bg-dank-pink/15 shadow-glow'
                : 'border-white/10 bg-white/5 hover:bg-white/10',
            )}
            aria-label={`avatar ${a}`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => profile.setProfile({ color: c })}
            className={clsx(
              'h-7 w-7 rounded-full border transition active:translate-y-px',
              profile.color === c ? 'border-white shadow-glow' : 'border-white/10',
            )}
            style={{ backgroundColor: c }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
