import { nanoid } from 'nanoid';
import {
  buildWordMask,
  classifyGuess,
  DEFAULT_CONFIG,
  GAME_LIMITS,
  leaksWord,
  pickThreeWords,
  scoreForGuess,
  type AchievementId,
  type ChatMessage,
  type Phase,
  type Player,
  type PublicGameState,
  type RoomConfig,
  type Stroke,
  type Team,
  type WordEntry,
} from '@dankdraw/shared';

export interface RoomEvents {
  state: (state: PublicGameState) => void;
  chat: (msg: ChatMessage) => void;
  wordChoices: (drawerId: string, words: string[], endsAt: number) => void;
  roundStart: (drawerId: string, word: string, wordMask: string, endsAt: number) => void;
  roundHint: (wordMask: string) => void;
  roundEnd: (
    word: string,
    perPlayer: { playerId: string; gained: number; guessed: boolean }[],
    endsAt: number,
  ) => void;
  gameEnd: (
    podium: { playerId: string; score: number; name: string; avatar: string }[],
  ) => void;
  strokeStart: (
    fromId: string,
    p: { id: string; tool: Stroke['tool']; color: string; size: number; point: [number, number, number] },
  ) => void;
  strokeAppend: (fromId: string, p: { id: string; points: [number, number, number][] }) => void;
  strokeEnd: (fromId: string, p: { id: string }) => void;
  strokeUndo: (strokeId: string) => void;
  canvasClear: () => void;
  canvasFill: (fromId: string, p: { x: number; y: number; color: string }) => void;
  reaction: (fromId: string, emoji: string) => void;
  whisper: (toId: string, msg: ChatMessage) => void;
  achievement: (toId: string, achievementId: AchievementId) => void;
  closed: () => void;
}

type Listener<T extends keyof RoomEvents> = RoomEvents[T];

/**
 * Authoritative room state + game loop. Pure logic — no socket.io references.
 * Emits events for the gateway to broadcast.
 */
export class Room {
  readonly code: string;
  config: RoomConfig;
  hostId: string;
  phase: Phase = 'lobby';
  round = 0;
  players = new Map<string, Player>();
  drawerId: string | null = null;
  private currentWord: WordEntry | null = null;
  private currentChoices: WordEntry[] = [];
  private revealed = new Set<number>();
  private hasGuessed = new Set<string>();
  private guessOrder: string[] = [];
  private roundScores = new Map<string, number>();
  private chatLog: ChatMessage[] = [];
  private strokes: Stroke[] = [];
  private liveStrokes = new Map<string, Stroke>();
  private drawerQueue: string[] = [];
  private recentlyUsed = new Set<string>();
  private phaseTimer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private phaseEndsAt: number | null = null;
  private listeners: { [K in keyof RoomEvents]: Set<Listener<K>> } = {
    state: new Set(),
    chat: new Set(),
    wordChoices: new Set(),
    roundStart: new Set(),
    roundHint: new Set(),
    roundEnd: new Set(),
    gameEnd: new Set(),
    strokeStart: new Set(),
    strokeAppend: new Set(),
    strokeEnd: new Set(),
    strokeUndo: new Set(),
    canvasClear: new Set(),
    canvasFill: new Set(),
    reaction: new Set(),
    whisper: new Set(),
    achievement: new Set(),
    closed: new Set(),
  };

  /** Map socket.id → persistent clientId (from localStorage). */
  clientIds = new Map<string, string>();
  /** Per-game stats keyed by socket.id. Reset at start(). */
  private gameStats = new Map<string, { drawn: number; guessed: number; streak: number; bestStreak: number }>();
  /** Achievements already unlocked this session, to avoid re-emit spam. */
  private sessionAchievements = new Set<string>();

  constructor(code: string, hostId: string, config: Partial<RoomConfig> = {}) {
    this.code = code;
    this.hostId = hostId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── pub/sub ──
  on<K extends keyof RoomEvents>(event: K, listener: RoomEvents[K]) {
    this.listeners[event].add(listener as never);
    return () => this.listeners[event].delete(listener as never);
  }
  private emit<K extends keyof RoomEvents>(event: K, ...args: Parameters<RoomEvents[K]>) {
    for (const fn of this.listeners[event]) (fn as (...a: unknown[]) => void)(...args);
  }

  // ── public state snapshot ──
  snapshot(): PublicGameState {
    const players = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    let teamScores: { red: number; blue: number } | null = null;
    if (this.config.mode === 'teams') {
      teamScores = { red: 0, blue: 0 };
      for (const p of players) {
        if (p.team) teamScores[p.team] += p.score;
      }
    }
    return {
      roomCode: this.code,
      hostId: this.hostId,
      config: this.config,
      players,
      phase: this.phase,
      round: this.round,
      totalRounds: this.config.rounds,
      drawerId: this.drawerId,
      wordMask: this.currentWord ? buildWordMask(this.currentWord.word, this.revealed) : null,
      wordReveal: this.phase === 'roundEnd' && this.currentWord ? this.currentWord.word : null,
      phaseEndsAt: this.phaseEndsAt,
      teamScores,
    };
  }

  recentChat(): ChatMessage[] {
    return this.chatLog.slice(-50);
  }

  allStrokes(): Stroke[] {
    return this.strokes.concat([...this.liveStrokes.values()]);
  }

  // ── join / leave ──
  addPlayer(id: string, name: string, avatar: string, color: string, clientId?: string): Player {
    const isHost = this.players.size === 0 || id === this.hostId;
    if (this.players.size === 0) this.hostId = id;
    if (clientId) this.clientIds.set(id, clientId);
    const team: Team | null =
      this.config.mode === 'teams'
        ? this.balanceTeam()
        : null;
    const player: Player = {
      id,
      name,
      avatar,
      color,
      team,
      score: 0,
      roundScore: 0,
      hasGuessed: false,
      isHost,
      isDrawing: false,
      isConnected: true,
      joinedAt: Date.now(),
    };
    this.players.set(id, player);
    this.system(`${name} joined`);
    this.broadcastState();
    return player;
  }

  private balanceTeam(): Team {
    let red = 0;
    let blue = 0;
    for (const p of this.players.values()) {
      if (p.team === 'red') red++;
      else if (p.team === 'blue') blue++;
    }
    return red <= blue ? 'red' : 'blue';
  }

  setTeam(byId: string, targetId: string, team: Team) {
    if (byId !== this.hostId || this.phase !== 'lobby') return;
    const p = this.players.get(targetId);
    if (!p) return;
    p.team = team;
    this.broadcastState();
  }

  removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    this.clientIds.delete(id);
    this.gameStats.delete(id);
    this.system(`${p.name} left`);

    if (this.players.size === 0) {
      this.cancelTimers();
      this.emit('closed');
      return;
    }

    if (this.hostId === id) {
      this.hostId = [...this.players.keys()][0]!;
      const newHost = this.players.get(this.hostId)!;
      newHost.isHost = true;
      this.system(`${newHost.name} is now the host`);
    }

    if (this.drawerId === id && (this.phase === 'wordChoice' || this.phase === 'drawing')) {
      this.system(`${p.name} (drawer) left — round ended`);
      this.endRound('drawerLeft');
      return;
    }

    this.broadcastState();
  }

  setConnected(id: string, connected: boolean) {
    const p = this.players.get(id);
    if (!p) return;
    p.isConnected = connected;
    this.broadcastState();
  }

  updateConfig(playerId: string, partial: Partial<RoomConfig>) {
    if (playerId !== this.hostId || this.phase !== 'lobby') return;
    this.config = { ...this.config, ...partial };
    this.broadcastState();
  }

  kick(byId: string, targetId: string) {
    if (byId !== this.hostId || byId === targetId) return;
    const target = this.players.get(targetId);
    if (!target) return;
    this.removePlayer(targetId);
    this.system(`${target.name} was kicked`);
  }

  // ── game flow ──
  start(byId: string) {
    if (byId !== this.hostId || this.phase !== 'lobby') return;
    if (this.players.size < GAME_LIMITS.minPlayers) {
      this.systemTo(byId, 'Need at least 2 players to start');
      return;
    }
    this.round = 0;
    this.drawerQueue = [...this.players.keys()];
    this.gameStats.clear();
    this.sessionAchievements.clear();
    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
      p.isDrawing = false;
      this.gameStats.set(p.id, { drawn: 0, guessed: 0, streak: 0, bestStreak: 0 });
      // Auto-assign teams for any player that lacks one in teams mode
      if (this.config.mode === 'teams' && !p.team) {
        p.team = this.balanceTeam();
      }
      // Clear teams if mode is non-teams
      if (this.config.mode !== 'teams') p.team = null;
    }
    this.recentlyUsed.clear();
    this.advanceToNextRound();
  }

  private advanceToNextRound(): void {
    this.round += 1;
    if (this.round > this.config.rounds) {
      return this.endGame();
    }
    if (this.drawerQueue.length === 0) {
      this.drawerQueue = [...this.players.keys()];
    }
    const drawerId = this.drawerQueue.shift()!;
    if (!this.players.has(drawerId)) return this.advanceToNextRound();

    this.drawerId = drawerId;
    for (const p of this.players.values()) {
      p.isDrawing = p.id === drawerId;
      p.hasGuessed = false;
      p.roundScore = 0;
    }
    this.hasGuessed.clear();
    this.guessOrder = [];
    this.roundScores.clear();
    this.revealed.clear();
    this.strokes = [];
    this.liveStrokes.clear();
    this.emit('canvasClear');

    this.currentChoices = pickThreeWords(this.recentlyUsed, this.config.customWords);
    this.phase = 'wordChoice';
    this.phaseEndsAt = Date.now() + GAME_LIMITS.wordChoiceTime * 1000;
    this.broadcastState();
    this.emit(
      'wordChoices',
      drawerId,
      this.currentChoices.map((w) => w.word),
      this.phaseEndsAt,
    );

    this.scheduleTimer(GAME_LIMITS.wordChoiceTime * 1000, () => {
      // Auto-pick if drawer didn't choose
      if (this.phase === 'wordChoice') this.pickWord(drawerId, 0);
    });
  }

  pickWord(byId: string, index: number) {
    if (this.phase !== 'wordChoice' || byId !== this.drawerId) return;
    const entry = this.currentChoices[Math.max(0, Math.min(2, index))];
    if (!entry) return;
    this.currentWord = entry;
    this.recentlyUsed.add(entry.word);
    if (this.recentlyUsed.size > 80) {
      const first = this.recentlyUsed.values().next().value;
      if (first) this.recentlyUsed.delete(first);
    }
    this.beginDrawing();
  }

  private beginDrawing() {
    if (!this.currentWord || !this.drawerId) return;
    this.phase = 'drawing';
    this.phaseEndsAt = Date.now() + this.config.drawTimeSec * 1000;
    const mask = buildWordMask(this.currentWord.word, this.revealed);
    this.broadcastState();
    this.emit('roundStart', this.drawerId, this.currentWord.word, mask, this.phaseEndsAt);
    this.scheduleHints();
    this.scheduleTimer(this.config.drawTimeSec * 1000, () => this.endRound('timeUp'));
  }

  private scheduleHints() {
    if (!this.config.hintsEnabled || !this.currentWord) return;
    const word = this.currentWord.word;
    const letterIdx: number[] = [];
    for (let i = 0; i < word.length; i++) if (word[i] !== ' ') letterIdx.push(i);
    const maxReveal = Math.max(0, Math.floor(letterIdx.length * GAME_LIMITS.hintMaxFraction));
    if (maxReveal === 0) return;

    const interval = (this.config.drawTimeSec * 1000) / (maxReveal + 1);
    const reveal = () => {
      if (this.phase !== 'drawing' || !this.currentWord) return;
      const remaining = letterIdx.filter((i) => !this.revealed.has(i));
      if (remaining.length === 0 || this.revealed.size >= maxReveal) return;
      this.revealed.add(remaining[Math.floor(Math.random() * remaining.length)]!);
      const mask = buildWordMask(this.currentWord.word, this.revealed);
      this.emit('roundHint', mask);
      this.broadcastState();
      if (this.revealed.size < maxReveal) {
        this.hintTimer = setTimeout(reveal, interval);
      }
    };
    this.hintTimer = setTimeout(reveal, interval);
  }

  // ── chat / guesses ──
  chatSend(playerId: string, text: string, image?: string) {
    const p = this.players.get(playerId);
    if (!p) return;

    if (this.phase === 'drawing' && playerId === this.drawerId) {
      if (text && this.currentWord && leaksWord(text, this.currentWord.word)) {
        this.systemTo(playerId, "spoiler blocked: don't type the word!");
        return;
      }
      this.pushChat({ kind: 'player', authorId: p.id, authorName: p.name, text, image });
      return;
    }

    if (this.phase === 'drawing' && this.currentWord && !this.hasGuessed.has(playerId) && text && !image) {
      const verdict = classifyGuess(text, this.currentWord.word);
      if (verdict === 'correct') {
        this.acceptGuess(p);
        return;
      }
      if (verdict === 'close') {
        this.pushChat({ kind: 'player', authorId: p.id, authorName: p.name, text });
        this.systemTo(playerId, `you're close!`);
        return;
      }
      this.pushChat({ kind: 'guess', authorId: p.id, authorName: p.name, text });
      return;
    }

    this.pushChat({ kind: 'player', authorId: p.id, authorName: p.name, text, image });
  }

  private acceptGuess(p: Player) {
    if (!this.currentWord || !this.drawerId || !this.phaseEndsAt) return;
    this.hasGuessed.add(p.id);
    this.guessOrder.push(p.id);
    p.hasGuessed = true;
    const totalMs = this.config.drawTimeSec * 1000;
    const remainingMs = Math.max(0, this.phaseEndsAt - Date.now());
    const { guesser, drawer } = scoreForGuess({
      remainingMs,
      totalMs,
      difficulty: this.currentWord.difficulty,
      positionAmongGuessers: this.guessOrder.length - 1,
    });
    p.score += guesser;
    p.roundScore = guesser;
    this.roundScores.set(p.id, guesser);

    const drawerPlayer = this.players.get(this.drawerId);
    if (drawerPlayer) {
      drawerPlayer.score += drawer;
      drawerPlayer.roundScore = (drawerPlayer.roundScore ?? 0) + drawer;
      this.roundScores.set(this.drawerId, (this.roundScores.get(this.drawerId) ?? 0) + drawer);
    }

    // ── achievement detection ──
    const stats = this.gameStats.get(p.id);
    if (stats) {
      stats.guessed += 1;
      stats.streak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      if (stats.streak >= 3) this.unlock(p.id, 'streak');
    }
    if (this.guessOrder.length === 1) this.unlock(p.id, 'first_blood');
    const elapsedMs = totalMs - remainingMs;
    if (elapsedMs <= 8_000) this.unlock(p.id, 'speedster');
    if (remainingMs <= 3_000) this.unlock(p.id, 'late_bloomer');
    if (this.currentWord.difficulty === 'hard' && this.revealed.size === 0)
      this.unlock(p.id, 'detective');

    this.pushChat({
      kind: 'correct',
      authorId: null,
      authorName: null,
      text: `${p.name} guessed it! +${guesser}`,
    });
    this.broadcastState();

    const guessable = [...this.players.values()].filter((pl) => pl.id !== this.drawerId);
    if (this.hasGuessed.size >= guessable.length) {
      this.endRound('allGuessed');
    }
  }

  private unlock(playerId: string, achievementId: AchievementId) {
    const sessionKey = `${playerId}:${achievementId}`;
    if (this.sessionAchievements.has(sessionKey)) return;
    this.sessionAchievements.add(sessionKey);
    this.emit('achievement', playerId, achievementId);
  }

  private endRound(reason: 'timeUp' | 'allGuessed' | 'drawerLeft') {
    this.cancelTimers();
    if (!this.currentWord) {
      this.advanceToNextRound();
      return;
    }
    this.phase = 'roundEnd';
    this.phaseEndsAt = Date.now() + GAME_LIMITS.scoreboardTime * 1000;

    // Reset miss streaks; bump drawer's roundsDrawn.
    for (const p of this.players.values()) {
      const stats = this.gameStats.get(p.id);
      if (!stats) continue;
      if (p.id !== this.drawerId && !this.hasGuessed.has(p.id)) stats.streak = 0;
      if (p.id === this.drawerId) stats.drawn += 1;
    }
    // Picasso: drawer where every non-drawer guessed
    if (this.drawerId) {
      const guessers = [...this.players.values()].filter((pl) => pl.id !== this.drawerId);
      if (guessers.length > 0 && guessers.every((g) => this.hasGuessed.has(g.id))) {
        this.unlock(this.drawerId, 'picasso');
      }
    }

    const perPlayer = [...this.players.values()].map((p) => ({
      playerId: p.id,
      gained: this.roundScores.get(p.id) ?? 0,
      guessed: this.hasGuessed.has(p.id),
    }));
    if (reason === 'timeUp' && this.hasGuessed.size === 0) {
      this.pushChat({
        kind: 'system',
        authorId: null,
        authorName: null,
        text: `time's up! the word was "${this.currentWord.word}"`,
      });
    } else if (reason === 'allGuessed') {
      this.pushChat({
        kind: 'system',
        authorId: null,
        authorName: null,
        text: `everyone got it! the word was "${this.currentWord.word}"`,
      });
    }
    this.broadcastState();
    this.emit('roundEnd', this.currentWord.word, perPlayer, this.phaseEndsAt);
    this.scheduleTimer(GAME_LIMITS.scoreboardTime * 1000, () => {
      this.currentWord = null;
      this.advanceToNextRound();
    });
  }

  private endGame() {
    this.cancelTimers();
    this.phase = 'gameEnd';
    this.phaseEndsAt = Date.now() + GAME_LIMITS.gameEndTime * 1000;
    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score);
    const winnerId = sorted[0]?.id;
    const podium = sorted.map((p) => ({
      playerId: p.id,
      score: p.score,
      name: p.name,
      avatar: p.avatar,
    }));

    // Achievements: champion (winner), team_player (winner of teams game)
    if (winnerId) {
      this.unlock(winnerId, 'champion');
      if (this.config.mode === 'teams') {
        const winnerTeam = this.players.get(winnerId)?.team;
        if (winnerTeam) {
          for (const p of this.players.values()) {
            if (p.team === winnerTeam) this.unlock(p.id, 'team_player');
          }
        }
      }
    }

    this.broadcastState();
    this.emit('gameEnd', podium);
    this.scheduleTimer(GAME_LIMITS.gameEndTime * 1000, () => {
      this.phase = 'lobby';
      this.drawerId = null;
      this.currentWord = null;
      this.broadcastState();
    });
  }

  /** Snapshot of per-player game results for the gateway to persist. */
  collectGameResults(): {
    socketId: string;
    score: number;
    won: boolean;
    drawn: number;
    guessed: number;
  }[] {
    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score);
    const winner = sorted[0]?.id;
    return sorted.map((p) => {
      const stats = this.gameStats.get(p.id);
      return {
        socketId: p.id,
        score: p.score,
        won: p.id === winner,
        drawn: stats?.drawn ?? 0,
        guessed: stats?.guessed ?? 0,
      };
    });
  }

  // ── drawing ──
  private isDrawer(playerId: string) {
    return playerId === this.drawerId && this.phase === 'drawing';
  }

  strokeStart(
    playerId: string,
    p: { id: string; tool: Stroke['tool']; color: string; size: number; point: [number, number, number] },
  ) {
    if (!this.isDrawer(playerId)) return;
    if (this.strokes.length + this.liveStrokes.size >= GAME_LIMITS.maxStrokesPerRound) return;
    this.liveStrokes.set(p.id, {
      id: p.id,
      tool: p.tool,
      color: p.color,
      size: p.size,
      points: [p.point],
    });
    this.emit('strokeStart', playerId, p);
  }

  strokeAppend(playerId: string, p: { id: string; points: [number, number, number][] }) {
    if (!this.isDrawer(playerId)) return;
    const live = this.liveStrokes.get(p.id);
    if (!live) return;
    for (const pt of p.points) {
      if (live.points.length >= GAME_LIMITS.maxStrokePoints) break;
      live.points.push(pt);
    }
    this.emit('strokeAppend', playerId, p);
  }

  strokeEnd(playerId: string, p: { id: string }) {
    if (!this.isDrawer(playerId)) return;
    const live = this.liveStrokes.get(p.id);
    if (!live) return;
    this.liveStrokes.delete(p.id);
    this.strokes.push(live);
    this.emit('strokeEnd', playerId, p);
  }

  strokeUndo(playerId: string) {
    if (!this.isDrawer(playerId)) return;
    const last = this.strokes.pop();
    if (!last) return;
    this.emit('strokeUndo', last.id);
  }

  canvasClear(playerId: string) {
    if (!this.isDrawer(playerId)) return;
    this.strokes = [];
    this.liveStrokes.clear();
    this.emit('canvasClear');
  }

  canvasFill(playerId: string, p: { x: number; y: number; color: string }) {
    if (!this.isDrawer(playerId)) return;
    this.emit('canvasFill', playerId, p);
  }

  reaction(playerId: string, emoji: string) {
    if (!this.players.has(playerId)) return;
    this.emit('reaction', playerId, emoji);
  }

  // ── chat helpers ──
  private pushChat(partial: {
    kind: ChatMessage['kind'];
    authorId: string | null;
    authorName: string | null;
    text: string;
    image?: string;
  }) {
    const msg: ChatMessage = {
      id: nanoid(10),
      ts: Date.now(),
      kind: partial.kind,
      authorId: partial.authorId,
      authorName: partial.authorName,
      text: partial.text.slice(0, GAME_LIMITS.maxChatLength),
      ...(partial.image ? { image: partial.image } : {}),
    };
    this.chatLog.push(msg);
    if (this.chatLog.length > 200) this.chatLog.shift();
    this.emit('chat', msg);
  }
  private system(text: string) {
    this.pushChat({ kind: 'system', authorId: null, authorName: null, text });
  }
  private systemTo(playerId: string, text: string) {
    const msg: ChatMessage = {
      id: nanoid(10),
      ts: Date.now(),
      kind: 'system',
      authorId: null,
      authorName: null,
      text: text.slice(0, GAME_LIMITS.maxChatLength),
    };
    this.emit('whisper', playerId, msg);
  }

  // ── timer helpers ──
  private scheduleTimer(ms: number, fn: () => void) {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = setTimeout(fn, ms);
  }
  private cancelTimers() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.phaseTimer = null;
    this.hintTimer = null;
  }

  private broadcastState() {
    this.emit('state', this.snapshot());
  }

  destroy() {
    this.cancelTimers();
    this.players.clear();
  }
}
