import { useEffect } from 'react';
import { pushAchievement } from '@/components/AchievementToast';
import { sfx } from '@/lib/sfx';
import { getSocket } from '@/lib/socket';
import { useGame, useProfile } from '@/store/gameStore';

/**
 * Subscribes the game store to socket events. Mount once at app root.
 *
 * Hardening notes:
 * - The listener-registering effect has empty deps. It runs exactly once
 *   per component mount, so we can't accumulate duplicate listeners no
 *   matter how often the profile or store actions change reference.
 *   (We previously had ~19 deps including `profile.name`; every keystroke
 *   on the name input ran the cleanup → mount cycle, which is fine in
 *   theory but a single race in cleanup re-introduces the N² bug.)
 * - Handlers reach into the latest store state via `useGame.getState()`
 *   instead of closing over selector results, so they always see fresh
 *   actions without re-subscribing.
 * - A separate effect re-sends `hello` whenever the profile changes —
 *   that's the only piece that needs profile reactivity.
 */
export function useSocketBindings() {
  const profileName = useProfile((s) => s.name);
  const profileAvatar = useProfile((s) => s.avatar);
  const profileColor = useProfile((s) => s.color);
  const profileClientId = useProfile((s) => s.clientId);

  // ── Listeners: register once, never re-register ──
  useEffect(() => {
    const sock = getSocket();

    const sendHello = () => {
      const p = useProfile.getState();
      if (!p.name) return;
      sock.emit(
        'hello',
        { name: p.name, avatar: p.avatar, color: p.color, clientId: p.clientId },
        () => {},
      );
    };

    // Defensive: clear any stale listeners on these events before we add
    // ours. This is a belt-and-braces guard — under normal React lifecycle
    // it shouldn't matter, but if a previous mount's cleanup didn't run
    // (HMR, error during unmount, double-mount in StrictMode dev) we'd
    // otherwise stack up duplicates.
    // Listed inline as a const tuple so TS can narrow each entry to a
    // specific event name when we call sock.off below. The cast hop via
    // `unknown` keeps the loop typesafe without listing each .off() call.
    const events = [
      'connect',
      'room:joined',
      'room:state',
      'chat:message',
      'word:choices',
      'round:start',
      'round:hint',
      'round:end',
      'game:end',
      'stroke:start',
      'stroke:append',
      'stroke:end',
      'stroke:undo',
      'canvas:clear',
      'reaction',
      'cursor:move',
      'chat:typing',
      'achievement:unlock',
      'phone:assignment',
      'phone:waiting',
      'phone:reveal',
    ] as const;
    for (const e of events) (sock as unknown as { off(e: string): void }).off(e);

    sock.on('connect', sendHello);
    if (sock.connected) sendHello();

    sock.on('room:joined', (p) => useGame.getState().setRoomJoined(p));

    sock.on('room:state', (s) => {
      const game = useGame.getState();
      game.setState(s);
      const ids = new Set(s.players.map((pl) => pl.id));
      for (const id of game.cursors.keys()) {
        if (!ids.has(id)) game.removeCursor(id);
      }
    });

    sock.on('chat:message', (m) => {
      useGame.getState().pushChat(m);
      if (m.kind === 'correct') sfx.correct();
    });

    sock.on('word:choices', (c) => useGame.getState().setWordChoices(c));

    sock.on('round:start', (p) => {
      const game = useGame.getState();
      game.setMyWord(p.word ?? null);
      game.setWordChoices(null);
      sfx.whoosh();
    });

    sock.on('round:hint', () => {
      // mask comes through state already
    });

    sock.on('round:end', () => {
      const game = useGame.getState();
      game.setMyWord(null);
      game.setWordChoices(null);
    });

    sock.on('game:end', () => {
      const game = useGame.getState();
      game.setMyWord(null);
      game.setWordChoices(null);
      sfx.fanfare();
    });

    sock.on('stroke:start', (p) => {
      useGame.getState().upsertStrokeStart({
        id: p.id,
        tool: p.tool,
        color: p.color,
        size: p.size,
        points: [p.point],
      });
    });
    sock.on('stroke:append', (p) => useGame.getState().appendToStroke(p.id, p.points));
    sock.on('stroke:end', (p) => useGame.getState().finishStroke(p.id));
    sock.on('stroke:undo', (p) => useGame.getState().removeStroke(p.strokeId));
    sock.on('canvas:clear', () => useGame.getState().clearStrokes());

    sock.on('reaction', (p) => useGame.getState().addReaction(p.fromId, p.emoji));
    sock.on('cursor:move', (p) => useGame.getState().setCursor(p.fromId, p.x, p.y));
    sock.on('chat:typing', (p) => useGame.getState().setTyping(p.fromId, p.typing));

    sock.on('achievement:unlock', (a) => {
      pushAchievement(a);
      sfx.fanfare();
    });

    sock.on('phone:assignment', (a) => {
      const game = useGame.getState();
      game.setTelAssignment(a);
      game.setTelReveal(null);
      sfx.whoosh();
    });
    sock.on('phone:waiting', (w) => useGame.getState().setTelWaiting(w));
    sock.on('phone:reveal', (r) => {
      const game = useGame.getState();
      game.setTelReveal(r);
      game.setTelAssignment(null);
    });

    return () => {
      sock.off('connect', sendHello);
      const off = (sock as unknown as { off(e: string): void }).off.bind(sock);
      for (const e of events) {
        if (e !== 'connect') off(e);
      }
    };
  }, []);

  // ── Hello on profile change ──
  // Re-sends `hello` whenever the player updates their name, avatar, color
  // or (rarely) clientId so the server's record stays in sync. Doesn't
  // touch any listeners.
  useEffect(() => {
    const sock = getSocket();
    if (!profileName || !sock.connected) return;
    sock.emit(
      'hello',
      { name: profileName, avatar: profileAvatar, color: profileColor, clientId: profileClientId },
      () => {},
    );
  }, [profileName, profileAvatar, profileColor, profileClientId]);
}
