import { GAME_LIMITS, GameModeSchema, type RoomConfig } from '@dankdraw/shared';
import { motion } from 'framer-motion';
import { toast } from '@/components/Toasts';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';

const MODES: Array<{ id: RoomConfig['mode']; name: string; emoji: string; tagline: string; ready: boolean }> = [
  { id: 'classic', name: 'Classic', emoji: '🎨', tagline: 'pictionary, perfected', ready: true },
  { id: 'telephone', name: 'Telephone', emoji: '📞', tagline: 'gartic-style chains', ready: true },
  { id: 'speedrun', name: 'Speedrun', emoji: '⚡', tagline: 'short rounds, max chaos', ready: true },
  { id: 'teams', name: 'Teams', emoji: '🤝', tagline: 'red vs blue', ready: true },
  { id: 'custom', name: 'Custom Words', emoji: '✍️', tagline: 'your inside jokes', ready: true },
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
      className="flex flex-1 flex-col gap-6 p-3 sm:p-4 lg:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="chip">Room</span>
          <button
            onClick={copyInvite}
            className="font-display text-2xl tracking-[0.3em] text-white hover:text-dank-pink sm:text-3xl sm:tracking-[0.4em]"
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
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
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
              className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition sm:rounded-3xl sm:p-4 ${
                selected
                  ? 'border-dank-pink bg-dank-pink/15 shadow-glow'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              } ${!m.ready ? 'opacity-50' : ''}`}
            >
              <div className="text-2xl sm:text-3xl">{m.emoji}</div>
              <div className="mt-1 font-display text-base text-white sm:mt-2 sm:text-lg">
                {m.name}
              </div>
              <div className="text-[11px] text-white/60 sm:text-xs">{m.tagline}</div>
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

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
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
          <button className="btn-primary w-full px-6 text-base sm:w-auto sm:px-8 sm:text-lg" onClick={onStart}>
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
  const selfId = useGame((s) => s.selfId);
  const red = players.filter((p) => p.team === 'red');
  const blue = players.filter((p) => p.team === 'blue');
  const unassigned = players.filter((p) => !p.team);

  const setTeam = (playerId: string, team: 'red' | 'blue') => {
    // Server allows self-pick or host-picks-anyone. Match the client UI.
    const isSelf = playerId === selfId;
    if (!isSelf && !isHost) return;
    getSocket().emit('room:setTeam', { playerId, team });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamColumn
          label="🔴 Red"
          team="red"
          players={red}
          selfId={selfId}
          isHost={isHost}
          onSetTeam={setTeam}
        />
        <TeamColumn
          label="🔵 Blue"
          team="blue"
          players={blue}
          selfId={selfId}
          isHost={isHost}
          onSetTeam={setTeam}
        />
      </div>
      {unassigned.length > 0 && (
        <div className="panel border-dashed p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
            Pick a side
          </div>
          <div className="flex flex-col gap-1.5">
            {unassigned.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                currentTeam={null}
                canChange={p.id === selfId || isHost}
                onSetTeam={(t) => setTeam(p.id, t)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  label,
  team,
  players,
  selfId,
  isHost,
  onSetTeam,
}: {
  label: string;
  team: 'red' | 'blue';
  players: { id: string; name: string; avatar: string; color: string; team: 'red' | 'blue' | null }[];
  selfId: string | null;
  isHost: boolean;
  onSetTeam: (playerId: string, team: 'red' | 'blue') => void;
}) {
  const isRed = team === 'red';
  const ringColor = isRed ? 'border-dank-coral/40' : 'border-dank-sky/40';
  const bgColor = isRed ? 'bg-dank-coral/5' : 'bg-dank-sky/5';
  const selfHere = players.some((p) => p.id === selfId);

  return (
    <div className={`panel ${ringColor} ${bgColor} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-display text-lg">{label}</div>
        {!selfHere && selfId && (
          <button
            onClick={() => onSetTeam(selfId, team)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              isRed
                ? 'border-dank-coral/60 bg-dank-coral/10 text-dank-coral hover:bg-dank-coral/20'
                : 'border-dank-sky/60 bg-dank-sky/10 text-dank-sky hover:bg-dank-sky/20'
            }`}
          >
            join {isRed ? '🔴' : '🔵'}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {players.length === 0 && <div className="text-xs italic text-white/40">empty</div>}
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            currentTeam={p.team}
            canChange={p.id === selfId || isHost}
            onSetTeam={(t) => onSetTeam(p.id, t)}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  currentTeam,
  canChange,
  onSetTeam,
}: {
  player: { id: string; name: string; avatar: string; color: string };
  currentTeam: 'red' | 'blue' | null;
  canChange: boolean;
  onSetTeam: (team: 'red' | 'blue') => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: player.color + '40', boxShadow: `inset 0 0 0 2px ${player.color}` }}
      >
        {player.avatar}
      </div>
      <div className="flex-1 truncate text-sm">{player.name}</div>
      {canChange && (
        <div className="flex gap-1">
          <button
            onClick={() => onSetTeam('red')}
            disabled={currentTeam === 'red'}
            title="move to red"
            className={`h-7 rounded-full border px-2 text-[11px] font-semibold transition disabled:opacity-100 ${
              currentTeam === 'red'
                ? 'border-dank-coral bg-dank-coral/20 text-dank-coral'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-dank-coral/40 hover:text-dank-coral'
            }`}
          >
            🔴
          </button>
          <button
            onClick={() => onSetTeam('blue')}
            disabled={currentTeam === 'blue'}
            title="move to blue"
            className={`h-7 rounded-full border px-2 text-[11px] font-semibold transition disabled:opacity-100 ${
              currentTeam === 'blue'
                ? 'border-dank-sky bg-dank-sky/20 text-dank-sky'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-dank-sky/40 hover:text-dank-sky'
            }`}
          >
            🔵
          </button>
        </div>
      )}
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
