import { GAME_LIMITS, GameModeSchema, type RoomConfig } from '@dankdraw/shared';
import { motion } from 'framer-motion';
import { toast } from '@/components/Toasts';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';

const MODES: Array<{ id: RoomConfig['mode']; name: string; emoji: string; tagline: string; ready: boolean }> = [
  { id: 'classic', name: 'Classic', emoji: '🎨', tagline: 'pictionary, perfected', ready: true },
  { id: 'speedrun', name: 'Speedrun', emoji: '⚡', tagline: 'short rounds, max chaos', ready: true },
  { id: 'custom', name: 'Custom Words', emoji: '✍️', tagline: 'your inside jokes', ready: true },
  { id: 'teams', name: 'Teams', emoji: '🤝', tagline: 'red vs blue', ready: true },
];

export function Lobby() {
  const state = useGame((s) => s.state)!;
  const selfId = useGame((s) => s.selfId);
  const isHost = state.hostId === selfId;
  const config = state.config;

  const update = (patch: Partial<RoomConfig>) => {
    if (!isHost) return;
    getSocket().emit('room:updateConfig', { config: patch });
  };

  const onStart = () => {
    if (state.players.length < GAME_LIMITS.minPlayers) {
      toast(`need ${GAME_LIMITS.minPlayers}+ players`, 'error');
      return;
    }
    getSocket().emit('room:start');
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/r/${state.roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('invite link copied!', 'success');
    } catch {
      toast(state.roomCode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col gap-6 p-4 lg:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="chip">Room</span>
          <button
            onClick={copyInvite}
            className="ml-2 font-display text-3xl tracking-[0.4em] text-white hover:text-dank-pink"
            title="click to copy invite"
          >
            {state.roomCode}
          </button>
        </div>
        <div className="text-sm text-white/60">
          {state.players.length}/{config.maxPlayers} players
        </div>
      </div>

      {/* Mode picker */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MODES.map((m) => {
          const selected = config.mode === m.id;
          return (
            <button
              key={m.id}
              disabled={!isHost || !m.ready}
              onClick={() => {
                const patch: Partial<RoomConfig> = { mode: GameModeSchema.parse(m.id) };
                if (m.id === 'speedrun') patch.drawTimeSec = GAME_LIMITS.minDrawTime;
                if (m.id === 'classic') patch.drawTimeSec = 80;
                update(patch);
              }}
              className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition ${
                selected
                  ? 'border-dank-pink bg-dank-pink/15 shadow-glow'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              } ${!m.ready ? 'opacity-50' : ''}`}
            >
              <div className="text-3xl">{m.emoji}</div>
              <div className="mt-2 font-display text-lg text-white">{m.name}</div>
              <div className="text-xs text-white/60">{m.tagline}</div>
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Slider
          label="Rounds"
          value={config.rounds}
          min={GAME_LIMITS.minRounds}
          max={GAME_LIMITS.maxRounds}
          step={1}
          disabled={!isHost}
          onChange={(v) => update({ rounds: v })}
        />
        <Slider
          label="Draw time (s)"
          value={config.drawTimeSec}
          min={GAME_LIMITS.minDrawTime}
          max={GAME_LIMITS.maxDrawTime}
          step={5}
          disabled={!isHost}
          onChange={(v) => update({ drawTimeSec: v })}
        />
        <Slider
          label="Max players"
          value={config.maxPlayers}
          min={GAME_LIMITS.minPlayers}
          max={GAME_LIMITS.maxPlayers}
          step={1}
          disabled={!isHost}
          onChange={(v) => update({ maxPlayers: v })}
        />
      </div>

      {config.mode === 'teams' && <TeamsPanel isHost={isHost} />}

      {config.mode === 'custom' && (
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Custom words (one per line)
            </label>
            <span className="text-xs text-white/50">{config.customWords.length}/500</span>
          </div>
          <textarea
            disabled={!isHost}
            className="input min-h-[160px] font-mono text-sm leading-relaxed"
            placeholder={"banana\npeppa pig\ndoge\n…"}
            value={config.customWords.join('\n')}
            onChange={(e) =>
              update({
                customWords: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 500),
              })
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Toggle
            label="Hints"
            value={config.hintsEnabled}
            disabled={!isHost}
            onChange={(v) => update({ hintsEnabled: v })}
          />
          <Toggle
            label="Allow late join"
            value={config.allowLateJoin}
            disabled={!isHost}
            onChange={(v) => update({ allowLateJoin: v })}
          />
          <Toggle
            label="Private"
            value={config.isPrivate}
            disabled={!isHost}
            onChange={(v) => update({ isPrivate: v })}
          />
        </div>
        {isHost ? (
          <button className="btn-primary px-8 text-lg" onClick={onStart}>
            ▶︎ Start Game
          </button>
        ) : (
          <div className="text-sm italic text-white/60">waiting for host to start…</div>
        )}
      </div>
    </motion.div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="panel block p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/60">{label}</span>
        <span className="font-display text-2xl text-dank-mint">{value}</span>
      </div>
      <input
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dank-range mt-2 h-2 w-full"
      />
    </label>
  );
}

function TeamsPanel({ isHost }: { isHost: boolean }) {
  const players = useGame((s) => s.state?.players ?? []);
  const red = players.filter((p) => p.team === 'red');
  const blue = players.filter((p) => p.team === 'blue');
  const unassigned = players.filter((p) => !p.team);

  const moveTo = (playerId: string, team: 'red' | 'blue') => {
    if (!isHost) return;
    getSocket().emit('room:setTeam', { playerId, team });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TeamColumn label="🔴 Red" players={red} onSwap={(id) => moveTo(id, 'blue')} isHost={isHost} accent="dank-coral" />
      <TeamColumn label="🔵 Blue" players={blue} onSwap={(id) => moveTo(id, 'red')} isHost={isHost} accent="dank-sky" />
      {unassigned.length > 0 && (
        <div className="sm:col-span-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-3 text-xs text-white/60">
          {unassigned.length} player{unassigned.length === 1 ? '' : 's'} unassigned —
          they'll be auto-balanced when the host starts the game.
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  label,
  players,
  onSwap,
  isHost,
  accent,
}: {
  label: string;
  players: { id: string; name: string; avatar: string; color: string }[];
  onSwap: (id: string) => void;
  isHost: boolean;
  accent: string;
}) {
  const ringColor = accent === 'dank-coral' ? 'border-dank-coral/40' : 'border-dank-sky/40';
  const bgColor = accent === 'dank-coral' ? 'bg-dank-coral/5' : 'bg-dank-sky/5';
  return (
    <div className={`panel ${ringColor} ${bgColor} p-3`}>
      <div className="mb-2 font-display text-lg">{label}</div>
      <div className="space-y-1.5">
        {players.length === 0 && (
          <div className="text-xs italic text-white/40">empty</div>
        )}
        {players.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
              style={{ backgroundColor: p.color + '40', boxShadow: `inset 0 0 0 2px ${p.color}` }}
            >
              {p.avatar}
            </div>
            <div className="flex-1 truncate text-sm">{p.name}</div>
            {isHost && (
              <button
                onClick={() => onSwap(p.id)}
                className="text-xs text-white/50 hover:text-white"
                title="swap team"
              >
                ⇄
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
        value
          ? 'border-dank-mint/50 bg-dank-mint/15 text-dank-mint'
          : 'border-white/10 bg-white/5 text-white/70'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span
        className={`flex h-4 w-7 items-center rounded-full transition ${
          value ? 'bg-dank-mint/60' : 'bg-white/15'
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full bg-white transition ${value ? 'translate-x-3' : 'translate-x-1'}`}
        />
      </span>
      {label}
    </button>
  );
}
