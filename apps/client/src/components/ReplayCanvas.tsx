import type { Stroke } from '@dankdraw/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';

const VW = 1200;
const VH = 800;

/**
 * Read-only canvas that animates a saved stroke set up to a time fraction.
 * Distributes total stroke-points evenly along the timeline so scrubbing
 * feels smooth even though strokes have variable lengths.
 */
export function ReplayCanvas({ strokes }: { strokes: Stroke[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [scale, setScale] = useState(1);

  // Total point count → drives scrub progress
  const totalPoints = useMemo(
    () => strokes.reduce((acc, s) => acc + s.points.length, 0),
    [strokes],
  );

  useEffect(() => {
    const onResize = () => {
      const w = wrapRef.current?.getBoundingClientRect();
      if (!w) return;
      const s = Math.min(w.width / VW, w.height / VH);
      setScale(s);
      const c = canvasRef.current!;
      c.width = VW * devicePixelRatio;
      c.height = VH * devicePixelRatio;
      c.style.width = `${VW * s}px`;
      c.style.height = `${VH * s}px`;
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, VW, VH);

    const target = Math.round(totalPoints * t);
    let consumed = 0;
    for (const s of strokes) {
      if (consumed >= target) break;
      const room = target - consumed;
      const slice =
        room >= s.points.length
          ? s
          : { ...s, points: s.points.slice(0, Math.max(2, room)) };
      consumed += slice.points.length;
      drawStroke(ctx, slice);
    }
  }, [strokes, totalPoints, t, scale]);

  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let last = performance.now();
    const total = Math.max(1500, Math.min(8000, totalPoints * 8));
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((prev) => {
        const next = prev + dt / total;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalPoints]);

  if (strokes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-white/40">
        nothing was drawn
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wrapRef}
        className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      >
        <canvas ref={canvasRef} className="rounded-xl bg-white shadow-soft" />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setT(0);
            setPlaying(true);
          }}
          className="btn-secondary h-9 px-3 text-sm"
        >
          {playing ? '⏸ Playing…' : '▶ Replay'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          className="dank-range h-2 flex-1"
        />
      </div>
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  const opts = {
    size: s.size,
    thinning: s.tool === 'marker' ? 0.1 : 0.55,
    smoothing: 0.55,
    streamline: 0.45,
    last: true,
  };
  const points = s.points.length === 1 ? [s.points[0]!, s.points[0]!] : s.points;
  const stroke = getStroke(points as [number, number, number][], opts);
  ctx.save();
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.fillStyle = s.color;
    if (s.tool === 'marker') ctx.globalAlpha = 0.55;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0]![0], stroke[0]![1]);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i]![0], stroke[i]![1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
