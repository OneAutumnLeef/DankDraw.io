import { nanoid } from 'nanoid';
import {
  GAME_LIMITS,
  type Player,
  type Stroke,
  type TelAssignment,
  type TelBook,
  type TelPage,
} from '@dankdraw/shared';

interface ControllerHooks {
  /** Players currently in the game (snapshot at start). */
  players: () => Player[];
  emitState: () => void;
  emitAssignment: (toId: string, payload: TelAssignment) => void;
  emitWaiting: (submitted: number, total: number) => void;
  emitReveal: (
    bookIndex: number,
    pageIndex: number,
    book: TelBook,
    totalBooks: number,
    totalPages: number,
    endsAt: number,
  ) => void;
  setPhase: (phase: 'telPrompt' | 'telTurn' | 'telReveal' | 'lobby', endsAt: number | null) => void;
  /** Called when the controller is fully done (returning to lobby). */
  onComplete: () => void;
}

/**
 * Sketch-Telephone (Gartic-Phone-style) game flow.
 *
 *  Each player owns one "book". Pages are added across N rounds:
 *    round 0 — prompt: every player writes their book's opening prompt
 *    round 1..N-1 — alternating draw/caption: each player extends a
 *                   different book each round, rotated round-robin
 *    reveal — server walks through one book at a time, page by page
 */
export class TelephoneController {
  private playerIds: string[] = [];
  private books = new Map<string, TelBook>();
  /** Order of books, indexed by owner position. */
  private bookOrder: string[] = [];
  private turnIndex = 0;
  private totalTurns = 0;
  private submittedThisTurn = new Set<string>();
  private phaseTimer: NodeJS.Timeout | null = null;
  private revealTimer: NodeJS.Timeout | null = null;
  private revealBookIdx = 0;
  private revealPageIdx = 0;

  constructor(private hooks: ControllerHooks) {}

  start() {
    const players = this.hooks.players();
    if (players.length < 2) {
      this.hooks.onComplete();
      return;
    }
    this.playerIds = players.map((p) => p.id);
    this.totalTurns = players.length; // 1 prompt round + N-1 follow-up rounds = N total
    this.books.clear();
    this.bookOrder = [];
    for (const p of players) {
      const id = nanoid(10);
      this.books.set(id, {
        id,
        ownerId: p.id,
        ownerName: p.name,
        ownerAvatar: p.avatar,
        pages: [],
      });
      this.bookOrder.push(id);
    }
    this.turnIndex = 0;
    this.submittedThisTurn.clear();
    this.beginPromptPhase();
  }

  cancel() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.phaseTimer = null;
    this.revealTimer = null;
  }

  // ── Phase: prompt ──
  private beginPromptPhase() {
    const endsAt = Date.now() + GAME_LIMITS.telPromptSec * 1000;
    this.hooks.setPhase('telPrompt', endsAt);
    for (const pid of this.playerIds) {
      const bookId = this.bookForPlayer(pid, 0);
      this.hooks.emitAssignment(pid, {
        bookId,
        turnIndex: 0,
        totalTurns: this.totalTurns,
        action: 'prompt',
        previous: null,
        endsAt,
      });
    }
    this.scheduleTimer(GAME_LIMITS.telPromptSec * 1000, () => this.advanceTurn());
  }

  // ── Phase: turn (draw / caption) ──
  private beginTurnPhase() {
    const endsAt = Date.now() + GAME_LIMITS.telTurnSec * 1000;
    this.hooks.setPhase('telTurn', endsAt);
    const action: 'draw' | 'caption' = this.turnIndex % 2 === 1 ? 'draw' : 'caption';
    // turnIndex 1 → draw (after prompt), 2 → caption, 3 → draw, …
    for (const pid of this.playerIds) {
      const bookId = this.bookForPlayer(pid, this.turnIndex);
      const book = this.books.get(bookId)!;
      const previous = book.pages[book.pages.length - 1] ?? null;
      this.hooks.emitAssignment(pid, {
        bookId,
        turnIndex: this.turnIndex,
        totalTurns: this.totalTurns,
        action,
        previous,
        endsAt,
      });
    }
    this.scheduleTimer(GAME_LIMITS.telTurnSec * 1000, () => this.advanceTurn());
  }

  // ── Round-robin: at turn t, player at index i works on book at offset (i - t) mod N ──
  private bookForPlayer(playerId: string, turnIndex: number): string {
    const N = this.playerIds.length;
    const i = this.playerIds.indexOf(playerId);
    if (i < 0) return this.bookOrder[0]!;
    const idx = ((i - turnIndex) % N + N) % N;
    return this.bookOrder[idx]!;
  }

  // ── Player submissions ──
  submitPrompt(playerId: string, text: string) {
    if (this.turnIndex !== 0) return;
    this.applySubmission(playerId, this.turnIndex, {
      type: 'prompt',
      text,
      authorId: playerId,
    });
  }

  submitDraw(playerId: string, bookId: string, turnIndex: number, strokes: Stroke[]) {
    if (turnIndex !== this.turnIndex || turnIndex === 0) return;
    if ((turnIndex % 2) !== 1) return; // odd = draw
    if (this.bookForPlayer(playerId, turnIndex) !== bookId) return;
    this.applySubmission(playerId, turnIndex, {
      type: 'draw',
      strokes: strokes.slice(0, GAME_LIMITS.telMaxStrokes),
      authorId: playerId,
    });
  }

  submitCaption(playerId: string, bookId: string, turnIndex: number, text: string) {
    if (turnIndex !== this.turnIndex || turnIndex === 0) return;
    if ((turnIndex % 2) !== 0) return; // even = caption
    if (this.bookForPlayer(playerId, turnIndex) !== bookId) return;
    this.applySubmission(playerId, turnIndex, {
      type: 'caption',
      text,
      authorId: playerId,
    });
  }

  private applySubmission(playerId: string, turnIndex: number, page: TelPage) {
    if (this.submittedThisTurn.has(playerId)) return;
    const bookId = this.bookForPlayer(playerId, turnIndex);
    const book = this.books.get(bookId);
    if (!book) return;
    book.pages.push(page);
    this.submittedThisTurn.add(playerId);
    this.hooks.emitWaiting(this.submittedThisTurn.size, this.playerIds.length);
    if (this.submittedThisTurn.size >= this.playerIds.length) {
      this.advanceTurn();
    }
  }

  private advanceTurn() {
    this.cancelPhaseTimer();
    this.fillMissingSubmissions();
    this.submittedThisTurn.clear();
    this.turnIndex += 1;

    if (this.turnIndex >= this.totalTurns) {
      this.beginRevealPhase();
      return;
    }
    this.beginTurnPhase();
  }

  /** Auto-fill blank pages so every book ends with the same number of pages. */
  private fillMissingSubmissions() {
    const expectedPages = this.turnIndex + 1;
    for (const book of this.books.values()) {
      while (book.pages.length < expectedPages) {
        if (expectedPages === 1 || expectedPages % 2 === 1) {
          book.pages.push({ type: 'prompt', text: '(no entry)', authorId: '__system' });
        } else {
          book.pages.push({ type: 'caption', text: '(no entry)', authorId: '__system' });
        }
      }
    }
  }

  // ── Phase: reveal ──
  private beginRevealPhase() {
    this.revealBookIdx = 0;
    this.revealPageIdx = 0;
    this.hooks.setPhase('telReveal', null);
    this.tickReveal();
  }

  private tickReveal() {
    const totalBooks = this.bookOrder.length;
    if (this.revealBookIdx >= totalBooks) {
      this.hooks.setPhase('lobby', null);
      this.hooks.onComplete();
      return;
    }
    const bookId = this.bookOrder[this.revealBookIdx]!;
    const book = this.books.get(bookId);
    if (!book) {
      this.revealBookIdx += 1;
      this.revealPageIdx = 0;
      this.tickReveal();
      return;
    }
    if (this.revealPageIdx >= book.pages.length) {
      this.revealBookIdx += 1;
      this.revealPageIdx = 0;
      this.tickReveal();
      return;
    }
    const endsAt = Date.now() + GAME_LIMITS.telRevealPageSec * 1000;
    this.hooks.emitReveal(
      this.revealBookIdx,
      this.revealPageIdx,
      book,
      totalBooks,
      book.pages.length,
      endsAt,
    );
    this.revealPageIdx += 1;
    this.revealTimer = setTimeout(() => this.tickReveal(), GAME_LIMITS.telRevealPageSec * 1000);
  }

  // ── helpers ──
  private scheduleTimer(ms: number, fn: () => void) {
    this.cancelPhaseTimer();
    this.phaseTimer = setTimeout(fn, ms);
  }
  private cancelPhaseTimer() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = null;
  }
}
