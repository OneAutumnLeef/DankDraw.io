import { useEffect } from 'react';
import { pushAchievement } from '@/components/AchievementToast';
import { sfx } from '@/lib/sfx';
import { getSocket } from '@/lib/socket';
import { useGame, useProfile } from '@/store/gameStore';

/** Subscribes the game store to socket events. Mount once at app root. */
export function useSocketBindings() {
  const setRoomJoined = useGame((s) => s.setRoomJoined);
  const setState = useGame((s) => s.setState);
  const pushChat = useGame((s) => s.pushChat);
  const setMyWord = useGame((s) => s.setMyWord);
  const setWordChoices = useGame((s) => s.setWordChoices);
  const addReaction = useGame((s) => s.addReaction);
  const setCursor = useGame((s) => s.setCursor);
  const removeCursor = useGame((s) => s.removeCursor);
  const setTyping = useGame((s) => s.setTyping);
  const setTelAssignment = useGame((s) => s.setTelAssignment);
  const setTelWaiting = useGame((s) => s.setTelWaiting);
  const setTelReveal = useGame((s) => s.setTelReveal);
  const upsertStrokeStart = useGame((s) => s.upsertStrokeStart);
  const appendToStroke = useGame((s) => s.appendToStroke);
  const finishStroke = useGame((s) => s.finishStroke);
  const removeStroke = useGame((s) => s.removeStroke);
  const clearStrokes = useGame((s) => s.clearStrokes);
  const profile = useProfile();

  useEffect(() => {
    const sock = getSocket();

    const sendHello = () => {
      if (!profile.name) return;
      sock.emit(
        'hello',
        {
          name: profile.name,
          avatar: profile.avatar,
          color: profile.color,
          clientId: profile.clientId,
        },
        () => {},
      );
    };
    sock.on('connect', sendHello);
    if (sock.connected) sendHello();

    sock.on('room:joined', (p) => {
      setRoomJoined(p);
    });

    sock.on('room:state', (s) => {
      setState(s);
      const ids = new Set(s.players.map((pl) => pl.id));
      const cursors = useGame.getState().cursors;
      for (const id of cursors.keys()) {
        if (!ids.has(id)) removeCursor(id);
      }
    });

    sock.on('chat:message', (m) => {
      pushChat(m);
      if (m.kind === 'correct') sfx.correct();
    });

    sock.on('word:choices', (c) => setWordChoices(c));

    sock.on('round:start', (p) => {
      setMyWord(p.word ?? null);
      setWordChoices(null);
      sfx.whoosh();
    });

    sock.on('round:hint', () => {
      // word mask comes through state already; nothing extra needed
    });

    sock.on('round:end', () => {
      setMyWord(null);
      setWordChoices(null);
    });

    sock.on('game:end', () => {
      setMyWord(null);
      setWordChoices(null);
      sfx.fanfare();
    });

    sock.on('stroke:start', (p) => {
      upsertStrokeStart({
        id: p.id,
        tool: p.tool,
        color: p.color,
        size: p.size,
        points: [p.point],
      });
    });

    sock.on('stroke:append', (p) => {
      appendToStroke(p.id, p.points);
    });

    sock.on('stroke:end', (p) => {
      finishStroke(p.id);
    });

    sock.on('stroke:undo', (p) => {
      removeStroke(p.strokeId);
    });

    sock.on('canvas:clear', () => clearStrokes());

    sock.on('reaction', (p) => addReaction(p.fromId, p.emoji));

    sock.on('cursor:move', (p) => setCursor(p.fromId, p.x, p.y));

    sock.on('chat:typing', (p) => setTyping(p.fromId, p.typing));

    sock.on('achievement:unlock', (a) => {
      pushAchievement(a);
      sfx.fanfare();
    });

    sock.on('phone:assignment', (a) => {
      setTelAssignment(a);
      setTelReveal(null);
      sfx.whoosh();
    });
    sock.on('phone:waiting', (w) => setTelWaiting(w));
    sock.on('phone:reveal', (r) => {
      setTelReveal(r);
      setTelAssignment(null);
    });

    return () => {
      sock.off('connect', sendHello);
      sock.off('room:joined');
      sock.off('room:state');
      sock.off('chat:message');
      sock.off('word:choices');
      sock.off('round:start');
      sock.off('round:hint');
      sock.off('round:end');
      sock.off('game:end');
      sock.off('stroke:start');
      sock.off('stroke:append');
      sock.off('stroke:end');
      sock.off('stroke:undo');
      sock.off('canvas:clear');
      sock.off('reaction');
      sock.off('cursor:move');
      sock.off('chat:typing');
      sock.off('achievement:unlock');
      sock.off('phone:assignment');
      sock.off('phone:waiting');
      sock.off('phone:reveal');
    };
  }, [
    profile.name,
    profile.avatar,
    profile.color,
    setRoomJoined,
    setState,
    pushChat,
    setMyWord,
    setWordChoices,
    addReaction,
    setCursor,
    removeCursor,
    setTyping,
    setTelAssignment,
    setTelWaiting,
    setTelReveal,
    upsertStrokeStart,
    appendToStroke,
    finishStroke,
    removeStroke,
    clearStrokes,
  ]);
}
