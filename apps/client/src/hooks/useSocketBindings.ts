import { useEffect } from 'react';
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
        { name: profile.name, avatar: profile.avatar, color: profile.color },
        () => {},
      );
    };
    sock.on('connect', sendHello);
    if (sock.connected) sendHello();

    sock.on('room:joined', (p) => {
      setRoomJoined(p);
    });

    sock.on('room:state', (s) => setState(s));

    sock.on('chat:message', (m) => pushChat(m));

    sock.on('word:choices', (c) => setWordChoices(c));

    sock.on('round:start', (p) => {
      setMyWord(p.word ?? null);
      setWordChoices(null);
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
    upsertStrokeStart,
    appendToStroke,
    finishStroke,
    removeStroke,
    clearStrokes,
  ]);
}
