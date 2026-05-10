import { GAME_LIMITS } from '@dankdraw/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { shrinkImage } from '@/lib/image';
import { getSocket } from '@/lib/socket';
import { toast } from '@/components/Toasts';
import { useGame } from '@/store/gameStore';

export function Chat() {
  const chat = useGame((s) => s.chat);
  const selfId = useGame((s) => s.selfId);
  const players = useGame((s) => s.state?.players ?? []);
  const phase = useGame((s) => s.state?.phase);
  const typing = useGame((s) => s.typing);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef<{ on: boolean; ts: number }>({ on: false, ts: 0 });

  const me = players.find((p) => p.id === selfId);
  const isDrawer = !!me?.isDrawing;
  const guessing = phase === 'drawing' && !isDrawer && !me?.hasGuessed;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  // Stop typing on phase transitions.
  useEffect(() => {
    if (phase !== 'drawing') {
      if (lastTypingRef.current.on) {
        getSocket().emit('chat:typing', { typing: false });
        lastTypingRef.current = { on: false, ts: Date.now() };
      }
    }
  }, [phase]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    getSocket().emit('chat:send', { text });
    setDraft('');
    if (lastTypingRef.current.on) {
      getSocket().emit('chat:typing', { typing: false });
      lastTypingRef.current = { on: false, ts: Date.now() };
    }
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    const now = Date.now();
    const shouldBeTyping = v.trim().length > 0;
    if (shouldBeTyping !== lastTypingRef.current.on || now - lastTypingRef.current.ts > 2500) {
      getSocket().emit('chat:typing', { typing: shouldBeTyping });
      lastTypingRef.current = { on: shouldBeTyping, ts: now };
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (isDrawer && phase === 'drawing') {
      toast("you're drawing — no images right now", 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await shrinkImage(file);
      if (!url) {
        toast('image too big or unsupported', 'error');
        return;
      }
      getSocket().emit('chat:send', { text: '', image: url });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const placeholder = isDrawer
    ? phase === 'drawing'
      ? "you're drawing — keep quiet 🤫"
      : 'say something'
    : guessing
    ? 'type your guess…'
    : 'say something';

  const typingNames = players
    .filter((p) => p.id !== selfId && typing.has(p.id))
    .map((p) => p.name)
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
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
                      image={m.image}
                      kind={m.kind}
                    />
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {typingNames.length > 0 && (
        <div className="px-4 pb-1 text-[11px] text-white/40">
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 bg-ink-900 p-3">
        <button
          type="button"
          title="attach image"
          onClick={() => fileRef.current?.click()}
          className="btn-ghost h-10 w-10 p-0 text-lg"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          className="input flex-1"
          maxLength={GAME_LIMITS.maxChatLength}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
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
  image,
  kind,
}: {
  mine: boolean;
  authorName: string;
  text: string;
  image?: string;
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
        {image && (
          <img
            src={image}
            alt="meme"
            className="mb-1 max-h-48 max-w-full rounded-lg border border-white/10"
            draggable={false}
          />
        )}
        {text && <div>{text}</div>}
      </div>
    </div>
  );
}
