import {
  ACHIEVEMENT_INDEX,
  ChatSendSchema,
  CreateRoomSchema,
  CursorMoveSchema,
  GAME_LIMITS,
  HelloSchema,
  JoinRoomSchema,
  KickSchema,
  maskProfanity,
  PickWordSchema,
  PRESET_AVATARS,
  PRESET_COLORS,
  ReactionSchema,
  SetTeamSchema,
  StrokeAppendSchema,
  StrokeEndSchema,
  StrokeStartSchema,
  SubmitCaptionSchema,
  SubmitDrawSchema,
  SubmitPromptSchema,
  TypingSchema,
  UpdateConfigSchema,
  sanitiseText,
  type AchievementId,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@dankdraw/shared';
import type { Server, Socket } from 'socket.io';
import { repos } from './db.js';
import { Room } from './Room.js';
import { RoomManager } from './RoomManager.js';

interface SocketData {
  name?: string;
  avatar?: string;
  color?: string;
  clientId?: string;
  roomCode?: string;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function attachGateway(io: IO, manager: RoomManager) {
  /**
   * Set of rooms whose broadcast listeners are wired up. Each broadcaster
   * forwards a Room event to all (or specific) sockets via io.to(...) — so
   * we register them ONCE per room. Earlier we registered per-socket which
   * meant every chat / state event broadcast N times where N = #players.
   */
  const broadcastersAttached = new WeakSet<Room>();

  const ensureBroadcasters = (room: Room) => {
    if (broadcastersAttached.has(room)) return;
    broadcastersAttached.add(room);

    room.on('state', (s) => io.to(room.code).emit('room:state', s));
    room.on('chat', (m) => io.to(room.code).emit('chat:message', m));

    room.on('wordChoices', (drawerId, words, endsAt) => {
      io.to(drawerId).emit('word:choices', { words, endsAt });
    });

    room.on('roundStart', (drawerId, word, mask, endsAt) => {
      // Public broadcast to non-drawers (no word leaked).
      io.to(room.code).except(drawerId).emit('round:start', {
        drawerId,
        wordLength: word.length,
        wordMask: mask,
        endsAt,
      });
      // Drawer-only payload includes the word.
      io.to(drawerId).emit('round:start', {
        drawerId,
        wordLength: word.length,
        wordMask: mask,
        endsAt,
        word,
      });
    });

    room.on('roundHint', (mask) =>
      io.to(room.code).emit('round:hint', { wordMask: mask }),
    );

    room.on('roundEnd', (word, perPlayer, endsAt) =>
      io.to(room.code).emit('round:end', { word, perPlayer, endsAt }),
    );

    room.on('gameEnd', (podium) => {
      io.to(room.code).emit('game:end', { podium });
      // Persist stats — once per game end, not once per player listener.
      const results = room.collectGameResults();
      for (const r of results) {
        const cid = room.clientIds.get(r.socketId);
        if (!cid) continue;
        const player = room.players.get(r.socketId);
        if (!player) continue;
        repos.recordGame({
          clientId: cid,
          name: player.name,
          avatar: player.avatar,
          score: r.score,
          won: r.won,
          drawn: r.drawn,
          guessed: r.guessed,
        });
        const stats = repos.getPlayer(cid);
        if (stats) {
          if (stats.totalScore >= 1000) tryUnlockPersistent(io, r.socketId, cid, 'centurion');
          if (stats.gamesPlayed >= 10) tryUnlockPersistent(io, r.socketId, cid, 'globetrotter');
        }
      }
    });

    room.on('strokeStart', (fromId, p) =>
      io.to(room.code).except(fromId).emit('stroke:start', { ...p, fromId }),
    );
    room.on('strokeAppend', (fromId, p) =>
      io.to(room.code).except(fromId).emit('stroke:append', { ...p, fromId }),
    );
    room.on('strokeEnd', (fromId, p) =>
      io.to(room.code).except(fromId).emit('stroke:end', { ...p, fromId }),
    );
    room.on('strokeUndo', (id) =>
      io.to(room.code).emit('stroke:undo', { strokeId: id }),
    );
    room.on('canvasClear', () => io.to(room.code).emit('canvas:clear'));
    room.on('reaction', (fromId, emoji) =>
      io.to(room.code).emit('reaction', { fromId, emoji }),
    );

    room.on('whisper', (toId, msg) => {
      io.to(toId).emit('chat:message', msg);
    });

    room.on('achievement', (toId, achievementId: AchievementId) => {
      const cid = room.clientIds.get(toId);
      const isFirstUnlock = cid ? repos.unlockAchievement(cid, achievementId) : true;
      if (!isFirstUnlock) return;
      const def = ACHIEVEMENT_INDEX[achievementId];
      if (!def) return;
      io.to(toId).emit('achievement:unlock', def);
    });

    room.on('telAssignment', (toId, assignment) => {
      io.to(toId).emit('phone:assignment', assignment);
    });
    room.on('telWaiting', (submitted, total) =>
      io.to(room.code).emit('phone:waiting', { submitted, total }),
    );
    room.on('telReveal', (bi, pi, book, tb, tp, ea) =>
      io.to(room.code).emit('phone:reveal', {
        bookIndex: bi,
        pageIndex: pi,
        totalBooks: tb,
        totalPages: tp,
        book,
        endsAt: ea,
      }),
    );
    // The Room itself frees its listeners when GC'd, so when the last player
    // leaves and the manager drops the reference, this WeakSet entry also
    // gets collected — no manual cleanup needed.
  };

  io.on('connection', (socket) => {
    socket.data = {};

    socket.on('hello', (raw, ack) => {
      const parsed = HelloSchema.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'invalid name' });
      const name = sanitiseText(parsed.data.name, GAME_LIMITS.maxNameLength) || 'anon';
      socket.data.name = name;
      socket.data.avatar = PRESET_AVATARS.includes(parsed.data.avatar as never)
        ? parsed.data.avatar
        : PRESET_AVATARS[0];
      socket.data.color = PRESET_COLORS.includes(parsed.data.color as never)
        ? parsed.data.color
        : PRESET_COLORS[0];
      socket.data.clientId = parsed.data.clientId;
      if (socket.data.clientId) {
        repos.upsertPlayer({
          clientId: socket.data.clientId,
          name,
          avatar: socket.data.avatar!,
          color: socket.data.color!,
        });
      }
      ack?.({ ok: true });
    });

    socket.on('room:create', (raw, ack) => {
      if (!socket.data.name) return ack?.({ ok: false, error: 'send hello first' });
      const parsed = CreateRoomSchema.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'invalid config' });
      const room = manager.create(socket.id, parsed.data.config ?? {});
      ensureBroadcasters(room);
      joinSocketToRoom(socket, room);
      ack?.({ ok: true, roomCode: room.code });
    });

    socket.on('room:join', (raw, ack) => {
      if (!socket.data.name) return ack?.({ ok: false, error: 'send hello first' });
      const parsed = JoinRoomSchema.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'invalid code' });
      const room = manager.get(parsed.data.roomCode);
      if (!room) return ack?.({ ok: false, error: 'room not found' });

      // Try to restore a disconnected player by clientId before treating
      // this as a fresh join. Capacity / late-join rules don't apply to
      // a player who's already a member of the room.
      if (socket.data.clientId) {
        const restored = room.tryRejoin(
          socket.id,
          socket.data.clientId,
          socket.data.name ?? 'anon',
          socket.data.avatar ?? '🦊',
          socket.data.color ?? '#FF6BD6',
        );
        if (restored) {
          ensureBroadcasters(room);
          if (socket.data.roomCode) socket.leave(socket.data.roomCode);
          socket.data.roomCode = room.code;
          socket.emit('room:joined', {
            selfId: socket.id,
            state: room.snapshot(),
            recentChat: room.recentChat(),
            strokes: room.allStrokes(),
          });
          socket.join(room.code);
          return ack?.({ ok: true });
        }
      }

      if (room.players.size >= room.config.maxPlayers)
        return ack?.({ ok: false, error: 'room full' });
      if (!room.config.allowLateJoin && room.phase !== 'lobby')
        return ack?.({ ok: false, error: 'game already in progress' });
      ensureBroadcasters(room);
      joinSocketToRoom(socket, room);
      ack?.({ ok: true });
    });

    socket.on('room:leave', () => leaveRoom(socket, manager, 'intentional'));

    socket.on('room:updateConfig', (raw) => {
      const parsed = UpdateConfigSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.updateConfig(socket.id, parsed.data.config);
    });

    socket.on('room:start', () => currentRoom(socket, manager)?.start(socket.id));

    socket.on('room:kick', (raw) => {
      const parsed = KickSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.kick(socket.id, parsed.data.playerId);
    });

    socket.on('room:setTeam', (raw) => {
      const parsed = SetTeamSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.setTeam(socket.id, parsed.data.playerId, parsed.data.team);
    });

    socket.on('chat:send', (raw) => {
      const parsed = ChatSendSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      const text = maskProfanity(sanitiseText(parsed.data.text, GAME_LIMITS.maxChatLength));
      const image = parsed.data.image && /^data:image\/(png|jpeg|gif|webp);base64,/.test(parsed.data.image)
        ? parsed.data.image
        : undefined;
      if (!text && !image) return;
      room.chatSend(socket.id, text, image);
    });

    socket.on('reaction', (raw) => {
      const parsed = ReactionSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.reaction(socket.id, parsed.data.emoji);
    });

    socket.on('word:pick', (raw) => {
      const parsed = PickWordSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.pickWord(socket.id, parsed.data.index);
    });

    socket.on('stroke:start', (raw) => {
      const parsed = StrokeStartSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.strokeStart(socket.id, parsed.data);
    });

    socket.on('stroke:append', (raw) => {
      const parsed = StrokeAppendSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.strokeAppend(socket.id, parsed.data);
    });

    socket.on('stroke:end', (raw) => {
      const parsed = StrokeEndSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.strokeEnd(socket.id, parsed.data);
    });

    socket.on('stroke:undo', () => currentRoom(socket, manager)?.strokeUndo(socket.id));

    socket.on('canvas:clear', () => currentRoom(socket, manager)?.canvasClear(socket.id));

    socket.on('phone:submitPrompt', (raw) => {
      const parsed = SubmitPromptSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      const text = sanitiseText(parsed.data.text, GAME_LIMITS.maxChatLength);
      if (!text) return;
      room.telSubmitPrompt(socket.id, text);
    });

    socket.on('phone:submitDraw', (raw) => {
      const parsed = SubmitDrawSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.telSubmitDraw(
        socket.id,
        parsed.data.bookId,
        parsed.data.turnIndex,
        parsed.data.strokes,
      );
    });

    socket.on('phone:submitCaption', (raw) => {
      const parsed = SubmitCaptionSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      const text = sanitiseText(parsed.data.text, GAME_LIMITS.maxChatLength);
      if (!text) return;
      room.telSubmitCaption(
        socket.id,
        parsed.data.bookId,
        parsed.data.turnIndex,
        text,
      );
    });

    socket.on('cursor:move', (raw) => {
      const parsed = CursorMoveSchema.safeParse(raw);
      if (!parsed.success || !socket.data.roomCode) return;
      socket.volatile.to(socket.data.roomCode).emit('cursor:move', {
        fromId: socket.id,
        x: parsed.data.x,
        y: parsed.data.y,
      });
    });

    socket.on('chat:typing', (raw) => {
      const parsed = TypingSchema.safeParse(raw);
      if (!parsed.success || !socket.data.roomCode) return;
      socket.to(socket.data.roomCode).emit('chat:typing', {
        fromId: socket.id,
        typing: parsed.data.typing,
      });
    });

    socket.on('ping', (ack) => {
      try {
        ack?.(Date.now());
      } catch {
        // ignore
      }
    });

    socket.on('disconnect', () => leaveRoom(socket, manager, 'disconnect'));
  });
}

function currentRoom(socket: S, manager: RoomManager): Room | null {
  return socket.data.roomCode ? manager.get(socket.data.roomCode) : null;
}

/**
 * Adds the player to the Room, snapshots the room state to them, then puts
 * the socket into the room's broadcast channel.
 *
 * Order matters:
 *   1. addPlayer — fires the "X joined" chat event. The socket is NOT in
 *      the room.code channel yet, so the broadcaster's io.to(room.code)
 *      delivers only to existing members. The new player gets it via the
 *      recentChat snapshot below.
 *   2. socket.emit('room:joined', ...) — sends the new player their
 *      authoritative snapshot (state, recent chat including their own
 *      join, current strokes).
 *   3. socket.join(room.code) — only now do they start receiving live
 *      broadcasts. Without this ordering, the new player would see their
 *      own join twice (once from broadcast, once from snapshot).
 */
function joinSocketToRoom(socket: S, room: Room) {
  if (socket.data.roomCode) socket.leave(socket.data.roomCode);
  socket.data.roomCode = room.code;

  room.addPlayer(
    socket.id,
    socket.data.name ?? 'anon',
    socket.data.avatar ?? '🦊',
    socket.data.color ?? '#FF6BD6',
    socket.data.clientId,
  );

  socket.emit('room:joined', {
    selfId: socket.id,
    state: room.snapshot(),
    recentChat: room.recentChat(),
    strokes: room.allStrokes(),
  });

  socket.join(room.code);
}

function tryUnlockPersistent(
  io: IO,
  socketId: string,
  clientId: string,
  achievementId: AchievementId,
) {
  const isFirst = repos.unlockAchievement(clientId, achievementId);
  if (!isFirst) return;
  const def = ACHIEVEMENT_INDEX[achievementId];
  if (!def) return;
  io.to(socketId).emit('achievement:unlock', def);
}

function leaveRoom(socket: S, manager: RoomManager, reason: 'intentional' | 'disconnect') {
  if (!socket.data.roomCode) return;
  const code = socket.data.roomCode;
  socket.data.roomCode = undefined;
  socket.leave(code);
  const room = manager.get(code);
  if (!room) return;
  if (reason === 'intentional') {
    room.hardRemovePlayer(socket.id);
  } else {
    room.softRemovePlayer(socket.id);
  }
}
