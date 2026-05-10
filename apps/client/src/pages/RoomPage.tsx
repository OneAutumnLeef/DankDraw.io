import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@/components/Canvas';
import { Chat } from '@/components/Chat';
import { GameEnd } from '@/components/GameEnd';
import { HUD } from '@/components/HUD';
import { Lobby } from '@/components/Lobby';
import { PlayerList } from '@/components/PlayerList';
import { ReactionBar } from '@/components/ReactionBar';
import { RoundEnd } from '@/components/RoundEnd';
import { SettingsMenu } from '@/components/SettingsMenu';
import { toast } from '@/components/Toasts';
import { WaitingForWord } from '@/components/WaitingForWord';
import { WordChoiceModal } from '@/components/WordChoiceModal';
import { getSocket } from '@/lib/socket';
import { useGame, useProfile } from '@/store/gameStore';

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const profile = useProfile();
  const navigate = useNavigate();
  const state = useGame((s) => s.state);
  const selfId = useGame((s) => s.selfId);

  // If we land on /r/CODE without a state (e.g. direct navigation), join.
  useEffect(() => {
    if (state || !code) return;
    if (!profile.name.trim()) {
      navigate('/');
      return;
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
          toast(r.error ?? 'connect failed', 'error');
          navigate('/');
          return;
        }
        sock.emit('room:join', { roomCode: code.toUpperCase() }, (jr) => {
          if (!jr.ok) {
            toast(jr.error ?? 'could not join', 'error');
            navigate('/');
          }
        });
      },
    );
  }, [code, state, profile, navigate]);

  if (!code) return <Navigate to="/" replace />;

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        joining {code.toUpperCase()}…
      </div>
    );
  }

  const me = state.players.find((p) => p.id === selfId);
  const isDrawer = !!me?.isDrawing;

  const onLeave = () => {
    getSocket().emit('room:leave');
    useGame.getState().resetGameSession();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="font-display text-xl text-white hover:text-dank-pink"
            title="back to home"
          >
            DankDraw<span className="text-dank-mint">.io</span>
          </button>
          <span className="chip text-[10px]">
            {state.roomCode}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="hidden sm:inline">
            {state.players.length} player{state.players.length === 1 ? '' : 's'}
          </span>
          <SettingsMenu />
          <button onClick={onLeave} className="btn-ghost h-9 px-3 text-sm">
            Leave
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 p-3 lg:flex-row lg:p-4">
        {/* Left: player list */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="panel p-3">
            <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-white/50">
              Players
            </div>
            <PlayerList players={state.players} />
          </div>
        </aside>

        {/* Center: phase-driven main area */}
        <section className="flex flex-1 flex-col gap-3">
          {state.phase === 'lobby' && <Lobby />}
          {(state.phase === 'wordChoice' || state.phase === 'drawing') && (
            <>
              <HUD />
              {state.phase === 'wordChoice' && !isDrawer && <WaitingForWord />}
              {(state.phase === 'drawing' || (state.phase === 'wordChoice' && isDrawer)) && (
                <>
                  <motion.div layout className="flex flex-1 min-h-[420px]">
                    <Canvas isDrawer={isDrawer && state.phase === 'drawing'} />
                  </motion.div>
                  {state.phase === 'drawing' && !isDrawer && (
                    <div className="flex justify-center">
                      <ReactionBar />
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {state.phase === 'roundEnd' && <RoundEnd />}
          {state.phase === 'gameEnd' && <GameEnd />}
        </section>

        {/* Right: chat */}
        <aside className="lg:w-80 lg:shrink-0">
          <div className="panel flex h-[40vh] flex-col overflow-hidden lg:h-full">
            <Chat />
          </div>
        </aside>
      </main>

      <WordChoiceModal />
    </div>
  );
}
