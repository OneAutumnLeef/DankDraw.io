import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DB_PATH = process.env.DATA_DIR
  ? join(process.env.DATA_DIR, 'dankdraw.sqlite')
  : join(process.cwd(), 'data', 'dankdraw.sqlite');

if (!existsSync(dirname(DB_PATH))) mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    client_id     TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    avatar        TEXT NOT NULL,
    color         TEXT NOT NULL,
    games_played  INTEGER NOT NULL DEFAULT 0,
    games_won     INTEGER NOT NULL DEFAULT 0,
    rounds_drawn  INTEGER NOT NULL DEFAULT 0,
    rounds_guessed INTEGER NOT NULL DEFAULT 0,
    total_score   INTEGER NOT NULL DEFAULT 0,
    best_score    INTEGER NOT NULL DEFAULT 0,
    first_seen    INTEGER NOT NULL,
    last_seen     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   TEXT NOT NULL,
    name        TEXT NOT NULL,
    avatar      TEXT NOT NULL,
    score       INTEGER NOT NULL,
    won         INTEGER NOT NULL,
    ts          INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lb_ts ON leaderboard(ts);
  CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard(score);

  CREATE TABLE IF NOT EXISTS achievements (
    client_id     TEXT NOT NULL,
    achievement   TEXT NOT NULL,
    unlocked_at   INTEGER NOT NULL,
    PRIMARY KEY (client_id, achievement)
  );
`);

export interface PlayerRecord {
  clientId: string;
  name: string;
  avatar: string;
  color: string;
  gamesPlayed: number;
  gamesWon: number;
  roundsDrawn: number;
  roundsGuessed: number;
  totalScore: number;
  bestScore: number;
  firstSeen: number;
  lastSeen: number;
}

const upsertPlayer = db.prepare(`
  INSERT INTO players (client_id, name, avatar, color, first_seen, last_seen)
  VALUES (@clientId, @name, @avatar, @color, @ts, @ts)
  ON CONFLICT(client_id) DO UPDATE SET
    name = excluded.name,
    avatar = excluded.avatar,
    color = excluded.color,
    last_seen = excluded.last_seen
`);

const getPlayerStmt = db.prepare<[string]>(`
  SELECT client_id as clientId, name, avatar, color,
         games_played as gamesPlayed, games_won as gamesWon,
         rounds_drawn as roundsDrawn, rounds_guessed as roundsGuessed,
         total_score as totalScore, best_score as bestScore,
         first_seen as firstSeen, last_seen as lastSeen
  FROM players
  WHERE client_id = ?
`);

const recordGameResult = db.prepare(`
  UPDATE players SET
    games_played = games_played + 1,
    games_won    = games_won + @won,
    rounds_drawn = rounds_drawn + @drawn,
    rounds_guessed = rounds_guessed + @guessed,
    total_score  = total_score + @score,
    best_score   = MAX(best_score, @score),
    last_seen    = @ts
  WHERE client_id = @clientId
`);

const insertLeaderboardEntry = db.prepare(`
  INSERT INTO leaderboard (client_id, name, avatar, score, won, ts)
  VALUES (@clientId, @name, @avatar, @score, @won, @ts)
`);

const topLeaderboard = db.prepare<[number, number]>(`
  SELECT name, avatar, MAX(score) as score, COUNT(*) as games, SUM(won) as wins
  FROM leaderboard
  WHERE ts > ?
  GROUP BY client_id
  ORDER BY MAX(score) DESC, wins DESC
  LIMIT ?
`);

const insertAchievement = db.prepare(`
  INSERT OR IGNORE INTO achievements (client_id, achievement, unlocked_at)
  VALUES (?, ?, ?)
`);

const listAchievements = db.prepare<[string]>(`
  SELECT achievement, unlocked_at as unlockedAt
  FROM achievements
  WHERE client_id = ?
  ORDER BY unlocked_at ASC
`);

export const repos = {
  upsertPlayer(p: { clientId: string; name: string; avatar: string; color: string }) {
    upsertPlayer.run({ ...p, ts: Date.now() });
  },

  getPlayer(clientId: string): PlayerRecord | null {
    return (getPlayerStmt.get(clientId) as PlayerRecord | undefined) ?? null;
  },

  recordGame(args: {
    clientId: string;
    name: string;
    avatar: string;
    score: number;
    won: boolean;
    drawn: number;
    guessed: number;
  }) {
    const ts = Date.now();
    recordGameResult.run({
      clientId: args.clientId,
      score: args.score,
      won: args.won ? 1 : 0,
      drawn: args.drawn,
      guessed: args.guessed,
      ts,
    });
    insertLeaderboardEntry.run({
      clientId: args.clientId,
      name: args.name,
      avatar: args.avatar,
      score: args.score,
      won: args.won ? 1 : 0,
      ts,
    });
  },

  topLeaderboard(windowDays = 7, limit = 50) {
    const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    return topLeaderboard.all(since, limit) as {
      name: string;
      avatar: string;
      score: number;
      games: number;
      wins: number;
    }[];
  },

  unlockAchievement(clientId: string, achievement: string): boolean {
    const result = insertAchievement.run(clientId, achievement, Date.now());
    return result.changes > 0;
  },

  listAchievements(clientId: string) {
    return listAchievements.all(clientId) as { achievement: string; unlockedAt: number }[];
  },
};
