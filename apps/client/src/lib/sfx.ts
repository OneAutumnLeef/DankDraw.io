/**
 * Tiny WebAudio-based SFX. No external assets — sounds are synthesised on the
 * fly so the bundle stays light. Routed through a master gain so settings can
 * mute/scale without per-sound bookkeeping.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  return { ctx: ctx!, master: master! };
}

export function setSfxVolume(v: number) {
  if (!master) return;
  master.gain.value = Math.max(0, Math.min(1, v));
}

export function setSfxMuted(muted: boolean) {
  if (!master || !ctx) return;
  master.gain.value = muted ? 0 : 0.6;
}

interface BeepOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  detune?: number;
}

function beep(opts: BeepOptions) {
  try {
    const { ctx, master } = ensureCtx();
    if (master.gain.value === 0) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.value = opts.freq;
    if (opts.detune) o.detune.value = opts.detune;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + opts.duration);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + opts.duration + 0.05);
  } catch {
    // ignore — likely autoplay policy
  }
}

export const sfx = {
  click: () => beep({ freq: 720, duration: 0.06, type: 'square', attack: 0.001 }),
  pop: () => beep({ freq: 540, duration: 0.1, type: 'triangle' }),
  correct: () => {
    beep({ freq: 660, duration: 0.12, type: 'triangle' });
    setTimeout(() => beep({ freq: 990, duration: 0.16, type: 'triangle' }), 90);
  },
  wrong: () => beep({ freq: 200, duration: 0.18, type: 'sawtooth' }),
  tick: () => beep({ freq: 880, duration: 0.04, type: 'square' }),
  whoosh: () => {
    beep({ freq: 1200, duration: 0.18, type: 'sawtooth', detune: -800 });
  },
  fanfare: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => beep({ freq: f, duration: 0.18, type: 'triangle' }), i * 110),
    );
  },
};
