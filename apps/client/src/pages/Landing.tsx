import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { ProfilePicker } from '@/components/ProfilePicker';
import { toast } from '@/components/Toasts';
import { getSocket } from '@/lib/socket';
import { useProfile } from '@/store/gameStore';

export function Landing() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const ensureHello = () =>
    new Promise<boolean>((resolve) => {
      if (!profile.name.trim()) {
        toast('pick a name first', 'error');
        return resolve(false);
      }
      const sock = getSocket();
      sock.emit(
        'hello',
        {
          name: profile.name.trim(),
          avatar: profile.avatar,
          color: profile.color,
          clientId: profile.clientId,
        },
        (r) => {
          if (!r.ok) {
            toast(r.error ?? 'could not connect', 'error');
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    });

  const onCreate = async () => {
    if (busy) return;
    setBusy('create');
    if (!(await ensureHello())) return setBusy(null);
    getSocket().emit('room:create', {}, (r) => {
      setBusy(null);
      if (!r.ok || !r.roomCode) {
        toast(r.error ?? 'could not create room', 'error');
        return;
      }
      navigate(`/r/${r.roomCode}`);
    });
  };

  const onJoin = async () => {
    if (busy) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast('room codes are 6 characters', 'error');
      return;
    }
    setBusy('join');
    if (!(await ensureHello())) return setBusy(null);
    getSocket().emit('room:join', { roomCode: trimmed }, (r) => {
      setBusy(null);
      if (!r.ok) {
        toast(r.error ?? 'could not join room', 'error');
        return;
      }
      navigate(`/r/${trimmed}`);
    });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:items-stretch">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left"
      >
        <span className="chip mb-6 border-dank-pink/30 bg-dank-pink/10 text-dank-pink">
          v2.0 · Neo-Dank
        </span>
        <h1
          className="title-chrome mb-6 font-display text-6xl leading-[0.95] sm:text-7xl lg:text-8xl"
          style={{ WebkitTextStroke: '2px rgba(0,0,0,0.35)' }}
        >
          DankDraw<span className="text-dank-mint">.io</span>
        </h1>
        <p className="max-w-md font-scribble text-2xl text-white/80">
          draw, guess, laugh — pictionary, but extra dank.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60 lg:justify-start">
          <Stat label="Multiplayer" value="2–16" />
          <Stat label="Rounds" value="1–10" />
          <Stat label="Words" value="280+" />
          <Stat label="Modes" value="4" />
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="panel flex w-full max-w-md flex-col gap-6 p-8"
      >
        <div>
          <h2 className="font-display text-2xl text-white">Get in there</h2>
          <p className="text-sm text-white/60">your scribbles, your rules</p>
        </div>

        <ProfilePicker />

        <div className="flex flex-col gap-3">
          <button className="btn-primary" disabled={busy !== null} onClick={onCreate}>
            {busy === 'create' ? 'creating…' : 'Create a Room'}
          </button>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
            <span className="h-px flex-1 bg-white/10" />
            or join one
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono uppercase tracking-[0.4em]"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onJoin();
              }}
            />
            <button className="btn-secondary" disabled={busy !== null} onClick={onJoin}>
              Join
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/40">
          built at GGJ '24 · rebuilt with extra dank · v2.2
        </p>
      </motion.div>

      <LeaderboardCard />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="font-display text-base text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}
