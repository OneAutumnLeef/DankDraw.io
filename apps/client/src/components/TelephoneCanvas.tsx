import type { Stroke } from '@dankdraw/shared';
import { GAME_LIMITS } from '@dankdraw/shared';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';

const VW = 1200;
const VH = 800;
const PALETTE = [
  '#0E0B1F', '#FF6BD6', '#FF7676', '#FFAB76', '#FFE066',
  '#9DFFB6', '#A8FFE4', '#7CC4FF', '#C8B0FF', '#FFFFFF',
];

interface Props {
  onChange: (strokes: Stroke[]) => void;
  disabled?: boolean;
}

/**
 * Self-contained drawing canvas for Sketch Telephone — collects strokes locally
 * and reports them up via onChange. No server roundtrip per-stroke (the entire
 * drawing is submitted at the end of the turn).
 */
export function TelephoneCanvas({ onChange, disabled }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#0E0B1F');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const liveIdRef = useRef<string | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);

  // Resize / DPR
  useEffect(() => {
    const onResize = () => {
      const w = wrapRef.current?.getBoundingClientRect();
      if (!w) return;
      const s = Math.min(w.width / VW, w.height / VH);
      const c = canvasRef.current!;
      c.width = VW * devicePixelRatio;
      c.height = VH * devicePixelRatio;
      c.style.width = `${VW * s}px`;
      c.style.height = `${VH * s}px`;
      paint();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const paint = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, VW, VH);
    const all = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    for (const s of all) drawStroke(ctx, s);
  };

  useEffect(paint, [strokes]);

  const localPoint = (clientX: number, clientY: number, pressure: number): [number, number, number] => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VW;
    const y = ((clientY - rect.top) / rect.height) * VH;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.max(0, Math.min(1, pressure || 0.5))];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const id = nanoid(8);
    liveIdRef.current = id;
    const point = localPoint(e.clientX, e.clientY, e.pressure || 0.5);
    liveStrokeRef.current = {
      id,
      tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size,
      points: [point],
    };
    paint();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !liveIdRef.current || !liveStrokeRef.current) return;
    e.preventDefault();
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of evs) {
      if (liveStrokeRef.current.points.length >= GAME_LIMITS.telMaxStrokePoints) break;
      const point = localPoint(ev.clientX, ev.clientY, (ev as PointerEvent).pressure || 0.5);
      liveStrokeRef.current.points.push(point);
    }
    paint();
  };
  const onPointerUp = () => {
    if (!liveStrokeRef.current) return;
    const finished = liveStrokeRef.current;
    liveStrokeRef.current = null;
    liveIdRef.current = null;
    setStrokes((prev) => {
      const next = [...prev, finished];
      onChange(next);
      return next;
    });
  };

  const undo = () =>
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      onChange(next);
      return next;
    });
  const clear = () => {
    setStrokes([]);
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wrapRef}
        className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="rounded-xl bg-white shadow-soft touch-none cursor-crosshair"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 p-2">
        <button
          onClick={() => setTool('pen')}
          className={`h-9 w-9 rounded-xl border ${tool === 'pen' ? 'border-dank-pink bg-dank-pink/15' : 'border-white/10 bg-white/5'}`}
        >
          🖊
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`h-9 w-9 rounded-xl border ${tool === 'eraser' ? 'border-dank-pink bg-dank-pink/15' : 'border-white/10 bg-white/5'}`}
        >
          🧽
        </button>
        <div className="flex flex-wrap gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={`h-7 w-7 rounded-md border-2 ${color === c && tool === 'pen' ? 'border-white scale-110' : 'border-black/20'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input
          type="range"
          min={2}
          max={50}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="dank-range h-2 w-24"
        />
        <button onClick={undo} className="btn-secondary h-9 px-3 text-xs">↶ Undo</button>
        <button onClick={clear} className="btn-secondary h-9 px-3 text-xs">🗑 Clear</button>
      </div>
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  const opts = { size: s.size, thinning: 0.55, smoothing: 0.55, streamline: 0.45, last: true };
  const points = s.points.length === 1 ? [s.points[0]!, s.points[0]!] : s.points;
  const stroke = getStroke(points as [number, number, number][], opts);
  ctx.save();
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.fillStyle = s.color;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0]![0], stroke[0]![1]);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i]![0], stroke[i]![1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
