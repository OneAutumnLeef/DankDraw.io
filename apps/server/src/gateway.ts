import {
  ACHIEVEMENT_INDEX,
  ChatSendSchema,
  CreateRoomSchema,
  CursorMoveSchema,
  FillSchema,
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
  type ChatMessage,
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
  cleanup?: () => void;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function attachGateway(io: IO, manager: RoomManager) {
  io.on('connection', (socket) => {
    socket.data = { name: undefined };

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
      joinSocketToRoom(io, socket, room);
      ack?.({ ok: true, roomCode: room.code });
    });

    socket.on('room:join', (raw, ack) => {
      if (!socket.data.name) return ack?.({ ok: false, error: 'send hello first' });
      const parsed = JoinRoomSchema.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'invalid code' });
      const room = manager.get(parsed.data.roomCode);
      if (!room) return ack?.({ ok: false, error: 'room not found' });
      if (room.players.size >= room.config.maxPlayers)
        return ack?.({ ok: false, error: 'room full' });
      if (!room.config.allowLateJoin && room.phase !== 'lobby')
        return ack?.({ ok: false, error: 'game already in progress' });
      joinSocketToRoom(io, socket, room);
      ack?.({ ok: true });
    });

    socket.on('room:leave', () => leaveRoom(socket, manager));

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

    socket.on('canvas:fill', (raw) => {
      const parsed = FillSchema.safeParse(raw);
      const room = currentRoom(socket, manager);
      if (!parsed.success || !room) return;
      room.canvasFill(socket.id, parsed.data);
    });

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
      socket.to(socket.data.roomCode).emit('cursor:move', {
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

    socket.on('disconnect', () => leaveRoom(socket, manager));
  });
}

function currentRoom(socket: S, manager: RoomManager): Room | null {
  return socket.data.roomCode ? manager.get(socket.data.roomCode) : null;
}

function joinSocketToRoom(io: IO, socket: S, room: Room) {
  // Detach from any prior room (no manager.removePlayer call here — caller already did that path
  // by joining a new room. We just unsubscribe socket-level listeners).
  socket.data.cleanup?.();
  socket.data.cleanup = undefined;
  if (socket.data.roomCode) socket.leave(socket.data.roomCode);

  socket.join(room.code);
  socket.data.roomCode = room.code;

  room.addPlayer(
    socket.id,
    socket.data.name ?? 'anon',
    socket.data.avatar ?? '🦊',
    socket.data.color ?? '#FF6BD6',
    socket.data.clientId,
  );

  // Snapshot to the new player.
  socket.emit('room:joined', {
    selfId: socket.id,
    state: room.snapshot(),
    recentChat: room.recentChat(),
    strokes: room.allStrokes(),
  });

  // Subscribe this socket's lifetime to room broadcasts.
  const offState = room.on('state', (s) => io.to(room.code).emit('room:state', s));
  const offChat = room.on('chat', (m) => io.to(room.code).emit('chat:message', m));
  const offWordChoices = room.on('wordChoices', (drawerId, words, endsAt) => {
    if (drawerId === socket.id) socket.emit('word:choices', { words, endsAt });
  });
  const offRoundStart = room.on('roundStart', (drawerId, word, mask, endsAt) => {
    io.to(room.code).emit('round:start', {
      drawerId,
      wordLength: word.length,
      wordMask: mask,
      endsAt,
    });
    // Send the actual word only to the drawer.
    io.to(drawerId).emit('round:start', {
      drawerId,
      wordLength: word.length,
      wordMask: mask,
      endsAt,
      word,
    });
  });
  const offRoundHint = room.on('roundHint', (mask) =>
    io.to(room.code).emit('round:hint', { wordMask: mask }),
  );
  const offRoundEnd = room.on('roundEnd', (word, perPlayer, endsAt) =>
    io.to(room.code).emit('round:end', { word, perPlayer, endsAt }),
  );
  const offGameEnd = room.on('gameEnd', (podium) => {
    io.to(room.code).emit('game:end', { podium });
    // Persist stats for every player who has a clientId.
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
      // Post-game cumulative achievements.
      const stats = repos.getPlayer(cid);
      if (stats) {
        if (stats.totalScore >= 1000) tryUnlockPersistent(io, r.socketId, cid, 'centurion');
        if (stats.gamesPlayed >= 10) tryUnlockPersistent(io, r.socketId, cid, 'globetrotter');
      }
    }
  });
  const offStrokeStart = room.on('strokeStart', (fromId, p) =>
    io.to(room.code).except(fromId).emit('stroke:start', { ...p, fromId }),
  );
  const offStrokeAppend = room.on('strokeAppend', (fromId, p) =>
    io.to(room.code).except(fromId).emit('stroke:append', { ...p, fromId }),
  );
  const offStrokeEnd = room.on('strokeEnd', (fromId, p) =>
    io.to(room.code).except(fromId).emit('stroke:end', { ...p, fromId }),
  );
  const offStrokeUndo = room.on('strokeUndo', (id) =>
    io.to(room.code).emit('stroke:undo', { strokeId: id }),
  );
  const offCanvasClear = room.on('canvasClear', () => io.to(room.code).emit('canvas:clear'));
  const offCanvasFill = room.on('canvasFill', (fromId, p) =>
    io.to(room.code).emit('canvas:fill', { ...p, fromId }),
  );
  const offReaction = room.on('reaction', (fromId, emoji) =>
    io.to(room.code).emit('reaction', { fromId, emoji }),
  );
  const offWhisper = room.on('whisper', (toId, msg: ChatMessage) => {
    if (toId === socket.id) socket.emit('chat:message', msg);
  });

  const offTelAssignment = room.on('telAssignment', (toId, assignment) => {
    if (toId === socket.id) socket.emit('phone:assignment', assignment);
  });
  const offTelWaiting = room.on('telWaiting', (submitted, total) =>
    io.to(room.code).emit('phone:waiting', { submitted, total }),
  );
  const offTelReveal = room.on('telReveal', (bi, pi, book, tb, tp, ea) =>
    io.to(room.code).emit('phone:reveal', {
      bookIndex: bi,
      pageIndex: pi,
      totalBooks: tb,
      totalPages: tp,
      book,
      endsAt: ea,
    }),
  );

  const offAchievement = room.on('achievement', (toId, achievementId) => {
    if (toId !== socket.id) return;
    const cid = socket.data.clientId;
    // Persist to DB if the client has an identity, with idempotent insert.
    const isFirstUnlock = cid ? repos.unlockAchievement(cid, achievementId) : true;
    if (!isFirstUnlock) return;
    const def = ACHIEVEMENT_INDEX[achievementId];
    if (!def) return;
    socket.emit('achievement:unlock', def);
  });

  socket.data.cleanup = () => {
    offState();
    offChat();
    offWordChoices();
    offRoundStart();
    offRoundHint();
    offRoundEnd();
    offGameEnd();
    offStrokeStart();
    offStrokeAppend();
    offStrokeEnd();
    offStrokeUndo();
    offCanvasClear();
    offCanvasFill();
    offReaction();
    offWhisper();
    offAchievement();
    offTelAssignment();
    offTelWaiting();
    offTelReveal();
  };
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

function leaveRoom(socket: S, manager: RoomManager) {
  if (!socket.data.roomCode) return;
  const code = socket.data.roomCode;
  socket.data.cleanup?.();
  socket.data.cleanup = undefined;
  socket.data.roomCode = undefined;
  socket.leave(code);
  manager.get(code)?.removePlayer(socket.id);
}
