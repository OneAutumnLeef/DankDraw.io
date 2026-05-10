import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@/components/Canvas';
import { Chat } from '@/components/Chat';
import { CompactPlayerStrip } from '@/components/CompactPlayerStrip';
import { GameEnd } from '@/components/GameEnd';
import { HUD } from '@/components/HUD';
import { Lobby } from '@/components/Lobby';
import { PingIndicator } from '@/components/PingIndicator';
import { PlayerList } from '@/components/PlayerList';
import { ReactionBar } from '@/components/ReactionBar';
import { RoundEnd } from '@/components/RoundEnd';
import { SettingsMenu } from '@/components/SettingsMenu';
import { TelephoneScreen } from '@/components/TelephoneScreen';
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
  const chat = useGame((s) => s.chat);
  /** On mobile only: a small bottom-sheet drawer for chat. */
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadAtClose, setUnreadAtClose] = useState(0);

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

  // Track unread messages while the mobile chat drawer is closed.
  useEffect(() => {
    if (chatOpen) setUnreadAtClose(chat.length);
  }, [chatOpen, chat.length]);

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
  const unread = Math.max(0, chat.length - unreadAtClose);

  const onLeave = () => {
    getSocket().emit('room:leave');
    useGame.getState().resetGameSession();
    navigate('/');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-2 backdrop-blur lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onLeave}
            className="truncate font-display text-lg text-white hover:text-dank-pink sm:text-xl"
            title="back to home"
          >
            DankDraw<span className="text-dank-mint">.io</span>
          </button>
          <span className="chip text-[10px]">{state.roomCode}</span>
          <PingIndicator />
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="hidden md:inline">
            {state.players.length} player{state.players.length === 1 ? '' : 's'}
          </span>
          <SettingsMenu />
          <button onClick={onLeave} className="btn-ghost h-9 px-3 text-sm">
            Leave
          </button>
        </div>
      </header>

      {/* Mobile-only: horizontal player strip */}
      <div className="shrink-0 border-b border-white/5 px-3 py-2 lg:hidden">
        <CompactPlayerStrip players={state.players} />
      </div>

      <main className="flex flex-1 flex-col gap-3 p-3 lg:min-h-0 lg:flex-row lg:overflow-hidden lg:p-4">
        {/* Desktop only: vertical player aside */}
        <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-hidden">
          <div className="panel flex h-full flex-col overflow-hidden p-3">
            <div className="mb-2 shrink-0 px-1 text-xs font-bold uppercase tracking-wider text-white/50">
              Players
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <PlayerList players={state.players} />
            </div>
          </div>
        </aside>

        {/* Center: phase-driven main area */}
        <section className="flex min-h-0 flex-1 flex-col gap-3 pb-16 lg:overflow-hidden lg:pb-0">
          {state.phase === 'lobby' && <Lobby />}
          {(state.phase === 'telPrompt' ||
            state.phase === 'telTurn' ||
            state.phase === 'telReveal') && <TelephoneScreen />}
          {(state.phase === 'wordChoice' || state.phase === 'drawing') && (
            <>
              <HUD />
              {state.phase === 'wordChoice' && !isDrawer && <WaitingForWord />}
              {(state.phase === 'drawing' || (state.phase === 'wordChoice' && isDrawer)) && (
                <>
                  <motion.div
                    layout
                    className="flex min-h-[220px] flex-1 sm:min-h-[280px] lg:min-h-0"
                  >
                    <Canvas isDrawer={isDrawer && state.phase === 'drawing'} />
                  </motion.div>
                  {state.phase === 'drawing' && !isDrawer && (
                    <div className="flex shrink-0 justify-center">
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

        {/* Desktop chat panel */}
        <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:overflow-hidden">
          <div className="panel flex h-full w-full flex-col overflow-hidden">
            <Chat />
          </div>
        </aside>
      </main>

      {/* Mobile-only chat drawer pinned to the bottom of the viewport. */}
      <MobileChatDrawer
        open={chatOpen}
        unread={unread}
        onToggle={() => setChatOpen((v) => !v)}
      />

      <WordChoiceModal />
    </div>
  );
}

function MobileChatDrawer({
  open,
  unread,
  onToggle,
}: {
  open: boolean;
  unread: number;
  onToggle: () => void;
}) {
  return (
    <div
      className={`pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-popover flex flex-col items-stretch lg:hidden`}
    >
      {/* Drawer handle */}
      <button
        onClick={onToggle}
        className="pointer-events-auto mx-auto mb-1 flex items-center gap-2 rounded-t-2xl border border-b-0 border-white/15 bg-ink-800/95 px-4 py-1 text-xs font-semibold text-white/80 backdrop-blur-xl shadow-soft"
        aria-expanded={open}
      >
        💬 Chat
        {!open && unread > 0 && (
          <span className="rounded-full bg-dank-pink px-2 py-0.5 text-[10px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        <span className="text-white/40">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          className="pointer-events-auto h-[55dvh] border-t border-white/10 bg-ink-900/95 backdrop-blur-xl"
        >
          <Chat />
        </motion.div>
      )}
    </div>
  );
}
