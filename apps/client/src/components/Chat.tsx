import { GAME_LIMITS } from '@dankdraw/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';

export function Chat() {
  const chat = useGame((s) => s.chat);
  const selfId = useGame((s) => s.selfId);
  const players = useGame((s) => s.state?.players ?? []);
  const phase = useGame((s) => s.state?.phase);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const me = players.find((p) => p.id === selfId);
  const isDrawer = !!me?.isDrawing;
  const guessing = phase === 'drawing' && !isDrawer && !me?.hasGuessed;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    getSocket().emit('chat:send', { text });
    setDraft('');
  };

  const placeholder = isDrawer
    ? phase === 'drawing'
      ? "you're drawing — keep quiet 🤫"
      : 'say something'
    : guessing
    ? 'type your guess…'
    : 'say something';

  return (
    <div className="flex h-full flex-col">
      <div
        ref={listRef}
        className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-3"
      >
        <AnimatePresence initial={false}>
          {chat.map((m) => {
            const mine = m.authorId === selfId;
            const author = players.find((p) => p.id === m.authorId);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className={clsx('flex items-start gap-2', mine && 'flex-row-reverse')}
              >
                {m.kind === 'system' || m.kind === 'correct' || m.kind === 'host' ? (
                  <SystemBubble msg={m} />
                ) : (
                  <>
                    {author && (
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{
                          backgroundColor: author.color + '40',
                          boxShadow: `inset 0 0 0 2px ${author.color}`,
                        }}
                        title={author.name}
                      >
                        {author.avatar}
                      </div>
                    )}
                    <PlayerBubble
                      mine={mine}
                      authorName={m.authorName ?? '?'}
                      text={m.text}
                      kind={m.kind}
                    />
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-white/10 bg-ink-900/60 p-3"
      >
        <input
          className="input flex-1"
          maxLength={GAME_LIMITS.maxChatLength}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          className={clsx(
            'btn px-4',
            guessing
              ? 'bg-gradient-to-br from-dank-mint to-dank-sky text-ink-900 shadow-glowMint'
              : 'btn-secondary',
          )}
        >
          {guessing ? 'Guess' : 'Send'}
        </button>
      </form>
    </div>
  );
}

function SystemBubble({ msg }: { msg: { text: string; kind: string } }) {
  const isCorrect = msg.kind === 'correct';
  return (
    <div
      className={clsx(
        'mx-auto rounded-full border px-3 py-1 text-xs font-semibold',
        isCorrect
          ? 'border-dank-mint/60 bg-dank-mint/15 text-dank-mint'
          : 'border-white/10 bg-white/5 text-white/60',
      )}
    >
      {msg.text}
    </div>
  );
}

function PlayerBubble({
  mine,
  authorName,
  text,
  kind,
}: {
  mine: boolean;
  authorName: string;
  text: string;
  kind: string;
}) {
  return (
    <div className={clsx('max-w-[80%] flex flex-col', mine && 'items-end')}>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{authorName}</div>
      <div
        className={clsx(
          'rounded-2xl px-3 py-1.5 text-sm',
          mine
            ? 'bg-dank-pink/15 text-white'
            : kind === 'guess'
            ? 'bg-white/5 text-white'
            : 'bg-white/10 text-white',
        )}
      >
        {text}
      </div>
    </div>
  );
}
