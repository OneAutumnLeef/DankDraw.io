import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProfilePicker } from '@/components/ProfilePicker';
import { toast } from '@/components/Toasts';
import { useProfile } from '@/store/gameStore';

/**
 * Landing surface that someone reaches via the host's "share invite" link.
 *
 * Invariants:
 *  - Always shows the profile picker, even if the visitor has a saved profile.
 *    The name field is cleared on mount so they have to confirm-by-typing.
 *  - Avatar / color / clientId are kept — clearing the clientId would break
 *    the rejoin path for someone who's already a member of this room and
 *    just clicked an invite link by accident.
 */
export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);

  // Clear the name on first mount so the user has to fill it in.
  useEffect(() => {
    profile.setProfile({ name: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!code) {
    navigate('/');
    return null;
  }

  const trimmed = code.toUpperCase();
  const ready = profile.name.trim().length > 0;

  const onContinue = () => {
    if (!ready || busy) return;
    if (trimmed.length !== 6) {
      toast('that code looks off', 'error');
      return;
    }
    setBusy(true);
    // RoomPage's effect will pick up the join when we land there.
    navigate(`/r/${trimmed}`);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col items-stretch justify-center gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <span className="chip mb-3 border-dank-pink/30 bg-dank-pink/10 text-dank-pink">
          🎟 Invite
        </span>
        <h1 className="title-chrome font-display text-4xl leading-[1] sm:text-5xl">
          Join the game
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Room <span className="font-mono font-bold tracking-[0.4em] text-white">{trimmed}</span>{' '}
          is waiting for you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="panel flex flex-col gap-6 p-6 sm:p-8"
      >
        <div>
          <h2 className="font-display text-xl text-white">Pick your vibe</h2>
          <p className="text-xs text-white/60">just a name + avatar to get in</p>
        </div>

        <ProfilePicker />

        <button
          className="btn-primary text-lg"
          disabled={!ready || busy}
          onClick={onContinue}
        >
          {busy ? 'joining…' : `Join ${trimmed}`}
        </button>

        <button
          className="btn-ghost text-xs text-white/40 hover:text-white"
          onClick={() => navigate('/')}
        >
          ← back to home
        </button>
      </motion.div>
    </div>
  );
}
