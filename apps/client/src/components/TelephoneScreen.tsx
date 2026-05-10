import { GAME_LIMITS, type Stroke, type TelPage } from '@dankdraw/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';
import { TelephoneCanvas } from './TelephoneCanvas';
import { ReplayCanvas } from './ReplayCanvas';

export function TelephoneScreen() {
  const phase = useGame((s) => s.state?.phase);
  const assignment = useGame((s) => s.telAssignment);
  const waiting = useGame((s) => s.telWaiting);
  const reveal = useGame((s) => s.telReveal);

  if (phase === 'telReveal' && reveal) {
    return <RevealView reveal={reveal} />;
  }

  if (!assignment) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="panel max-w-md p-8 text-center">
          <div className="font-display text-2xl">📞 Sketch Telephone</div>
          <div className="mt-2 text-sm text-white/60">waiting for the next round…</div>
        </div>
      </div>
    );
  }

  // Show "submitted, waiting for others" if user has already submitted this turn.
  // (Track via a local key per turnIndex so phase changes auto-reset it.)
  return (
    <AssignmentView
      assignment={assignment}
      waiting={waiting}
    />
  );
}

function AssignmentView({
  assignment,
  waiting,
}: {
  assignment: NonNullable<ReturnType<typeof useGame.getState>['telAssignment']>;
  waiting: { submitted: number; total: number } | null;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [text, setText] = useState('');
  const strokesRef = useRef<Stroke[]>([]);
  const remaining = useCountdown(assignment.endsAt);

  // Reset whenever the assignment changes (new turn).
  useEffect(() => {
    setSubmitted(false);
    setText('');
    strokesRef.current = [];
  }, [assignment.bookId, assignment.turnIndex]);

  const submit = () => {
    if (submitted) return;
    if (assignment.action === 'prompt') {
      const t = text.trim();
      if (!t) return;
      getSocket().emit('phone:submitPrompt', { text: t });
    } else if (assignment.action === 'caption') {
      const t = text.trim();
      if (!t) return;
      getSocket().emit('phone:submitCaption', {
        bookId: assignment.bookId,
        turnIndex: assignment.turnIndex,
        text: t,
      });
    } else {
      getSocket().emit('phone:submitDraw', {
        bookId: assignment.bookId,
        turnIndex: assignment.turnIndex,
        strokes: strokesRef.current,
      });
    }
    setSubmitted(true);
  };

  const turnLabel = `Turn ${assignment.turnIndex + 1} / ${assignment.totalTurns}`;
  const danger = remaining <= 10;

  return (
    <div className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-white/50">📞 Telephone</div>
          <div className="truncate font-display text-base sm:text-xl">{turnLabel}</div>
        </div>
        <div
          className={`shrink-0 min-w-[60px] rounded-2xl border px-2 py-1.5 text-center font-display text-xl sm:px-3 sm:py-2 sm:text-2xl ${
            danger ? 'border-dank-coral/60 bg-dank-coral/15 text-dank-coral' : 'border-white/10 bg-white/5'
          }`}
        >
          {remaining}s
        </div>
      </div>

      {/* Previous-page reminder */}
      {assignment.previous && <PreviousPageView page={assignment.previous} />}

      {/* Action body */}
      {!submitted && assignment.action === 'prompt' && (
        <PromptInput
          value={text}
          onChange={setText}
          maxLen={GAME_LIMITS.telPromptMaxLen}
          placeholder="kick things off — write a goofy phrase"
          onSubmit={submit}
          submitLabel="Submit prompt"
        />
      )}
      {!submitted && assignment.action === 'caption' && (
        <PromptInput
          value={text}
          onChange={setText}
          maxLen={GAME_LIMITS.telCaptionMaxLen}
          placeholder="describe the drawing above"
          onSubmit={submit}
          submitLabel="Submit caption"
        />
      )}
      {!submitted && assignment.action === 'draw' && (
        <div className="flex flex-col gap-3">
          <TelephoneCanvas onChange={(s) => (strokesRef.current = s)} />
          <button onClick={submit} className="btn-primary self-end px-6">
            Submit drawing
          </button>
        </div>
      )}

      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel mx-auto max-w-md p-6 text-center"
        >
          <div className="text-3xl">✅</div>
          <div className="mt-2 font-display text-lg">submitted!</div>
          <div className="text-sm text-white/60">waiting for others…</div>
          {waiting && (
            <div className="mt-3 text-sm text-dank-mint">
              {waiting.submitted} / {waiting.total} done
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function PromptInput({
  value,
  onChange,
  maxLen,
  placeholder,
  onSubmit,
  submitLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLen: number;
  placeholder: string;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="panel mx-auto flex w-full max-w-xl flex-col gap-3 p-6">
      <textarea
        autoFocus
        className="input min-h-[120px] text-lg"
        placeholder={placeholder}
        value={value}
        maxLength={maxLen}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/40">{value.length}/{maxLen} · ⌘↵ to submit</div>
        <button onClick={onSubmit} className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function PreviousPageView({ page }: { page: TelPage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel mx-auto w-full max-w-xl p-4"
    >
      <div className="text-[10px] uppercase tracking-widest text-white/40">
        {page.type === 'draw' ? 'previous drawing' : 'previous text'}
      </div>
      {page.type === 'draw' && (
        <div className="mt-2">
          <ReplayCanvas strokes={page.strokes} />
        </div>
      )}
      {page.type !== 'draw' && (
        <div className="mt-1 font-display text-2xl text-dank-mint">{page.text}</div>
      )}
    </motion.div>
  );
}

function RevealView({
  reveal,
}: {
  reveal: NonNullable<ReturnType<typeof useGame.getState>['telReveal']>;
}) {
  const remaining = useCountdown(reveal.endsAt);
  const page = reveal.book.pages[reveal.pageIndex];
  if (!page) return null;
  const author = useGame
    .getState()
    .state?.players.find((p) => p.id === page.authorId);

  return (
    <div className="flex flex-1 flex-col items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:p-8">
      <div className="flex w-full max-w-3xl items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] uppercase tracking-widest text-white/50">
            📖 Reveal — {reveal.book.ownerAvatar} {reveal.book.ownerName}'s book
          </div>
          <div className="font-display text-base sm:text-xl">
            book {reveal.bookIndex + 1} / {reveal.totalBooks} · page {reveal.pageIndex + 1} /{' '}
            {reveal.totalPages}
          </div>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 font-display text-base sm:px-3 sm:py-2 sm:text-xl">
          {remaining}s
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${reveal.bookIndex}-${reveal.pageIndex}`}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="panel mx-auto w-full max-w-3xl p-6"
        >
          {author && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-xl">{author.avatar}</span>
              <span className="font-semibold">{author.name}</span>
              <span className="text-white/40">
                {page.type === 'prompt' ? 'started with' : page.type === 'draw' ? 'drew' : 'said'}
              </span>
            </div>
          )}
          {page.type === 'draw' ? (
            <ReplayCanvas strokes={page.strokes} />
          ) : (
            <div className="break-words font-display text-2xl text-dank-mint sm:text-3xl">
              {page.text}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function useCountdown(endsAt: number | null): number {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}
