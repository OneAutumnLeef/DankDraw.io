import type { Stroke, Tool } from '@dankdraw/shared';
import { GAME_LIMITS } from '@dankdraw/shared';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import clsx from 'clsx';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/store/gameStore';
import { CursorPresence } from './CursorPresence';
import { ReactionLayer } from './ReactionLayer';

const PALETTE = [
  '#0E0B1F', '#FFFFFF',
  '#FF6BD6', '#FF7676', '#FFAB76', '#FFE066',
  '#9DFFB6', '#A8FFE4', '#7CC4FF', '#C8B0FF',
  '#3A2D6B', '#1F1738',
];

const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'pen', label: 'Pen', icon: '🖊', key: 'b' },
  { id: 'marker', label: 'Marker', icon: '🖍', key: 'm' },
  { id: 'eraser', label: 'Eraser', icon: '🧽', key: 'e' },
  { id: 'fill', label: 'Fill', icon: '🪣', key: 'f' },
];

const VIRTUAL_W = 1200;
const VIRTUAL_H = 800;

interface CanvasProps {
  isDrawer: boolean;
  className?: string;
}

export function Canvas({ isDrawer, className }: CanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0E0B1F');
  const [size, setSize] = useState(6);

  const strokes = useGame((s) => s.strokes);
  const liveStrokes = useGame((s) => s.liveStrokes);

  // ── Sizing ──
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const onResize = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const s = Math.min(rect.width / VIRTUAL_W, rect.height / VIRTUAL_H);
      setScale(s);
      const c = canvasRef.current!;
      c.width = VIRTUAL_W * devicePixelRatio;
      c.height = VIRTUAL_H * devicePixelRatio;
      c.style.width = `${VIRTUAL_W * s}px`;
      c.style.height = `${VIRTUAL_H * s}px`;
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Drawing render ──
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    const all: Stroke[] = [...strokes, ...Array.from(liveStrokes.values())];
    for (const s of all) renderStroke(ctx, s);
  }, [strokes, liveStrokes, scale]);

  // ── Pointer / drawing logic ──
  const liveIdRef = useRef<string | null>(null);
  const pointBufRef = useRef<[number, number, number][]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const localPoint = (clientX: number, clientY: number, pressure: number): [number, number, number] => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIRTUAL_W;
    const y = ((clientY - rect.top) / rect.height) * VIRTUAL_H;
    return [round(x), round(y), Math.max(0, Math.min(1, pressure || 0.5))];
  };

  const flush = () => {
    if (!liveIdRef.current || pointBufRef.current.length === 0) return;
    getSocket().emit('stroke:append', {
      id: liveIdRef.current,
      points: pointBufRef.current,
    });
    pointBufRef.current = [];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isDrawer) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    if (tool === 'fill') {
      // Flood fill is modeled as a single-point stroke with tool='fill' so
      // it lives in the room's persistent stroke history (survives re-renders,
      // replays, and late joiners) instead of being a fire-and-forget op.
      const id = nanoid(10);
      const point = localPoint(e.clientX, e.clientY, 1);
      useGame.getState().upsertStrokeStart({
        id,
        tool: 'fill',
        color,
        size: 1,
        points: [point],
      });
      const sock = getSocket();
      sock.emit('stroke:start', { id, tool: 'fill', color, size: 1, point });
      sock.emit('stroke:end', { id });
      // Commit locally so the optimistic stroke is rendered immediately on
      // the drawer's screen, mirroring the strokeEnd/finishStroke flow.
      useGame.getState().finishStroke(id);
      return;
    }

    const id = nanoid(10);
    liveIdRef.current = id;
    pointBufRef.current = [];
    const point = localPoint(e.clientX, e.clientY, e.pressure || 0.5);
    const useColor = tool === 'eraser' ? '#FFFFFF' : color;

    // Optimistic local stroke
    useGame.getState().upsertStrokeStart({
      id,
      tool,
      color: useColor,
      size,
      points: [point],
    });

    getSocket().emit('stroke:start', {
      id,
      tool,
      color: useColor,
      size,
      point,
    });
  };

  const lastCursorRef = useRef<number>(0);
  const phase = useGame((s) => s.state?.phase);
  const onPointerMove = (e: React.PointerEvent) => {
    // Cursor presence is only meaningful while someone is drawing — don't
    // burn bandwidth on it during lobby / scoreboard / etc. Throttle to
    // ~8 Hz to keep the wire light on slow links (Render free tier especially).
    if (phase === 'drawing') {
      const now = performance.now();
      if (now - lastCursorRef.current > 120) {
        lastCursorRef.current = now;
        const [cx, cy] = localPoint(e.clientX, e.clientY, 0);
        getSocket().volatile.emit('cursor:move', { x: cx, y: cy });
      }
    }

    if (!isDrawer || !liveIdRef.current) return;
    e.preventDefault();
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events) {
      const point = localPoint(ev.clientX, ev.clientY, (ev as PointerEvent).pressure || 0.5);
      pointBufRef.current.push(point);
      useGame.getState().appendToStroke(liveIdRef.current, [point]);
    }

    if (flushTimerRef.current === null) {
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flush();
      }, 50);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDrawer || !liveIdRef.current) return;
    e.preventDefault();
    flush();
    const id = liveIdRef.current;
    liveIdRef.current = null;
    useGame.getState().finishStroke(id);
    getSocket().emit('stroke:end', { id });
  };

  // ── Keyboard shortcuts (drawer only) ──
  useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        getSocket().emit('stroke:undo');
        return;
      }
      const found = TOOLS.find((t) => t.key === e.key.toLowerCase());
      if (found) setTool(found.id);
      if (e.key === '[') setSize((s) => Math.max(2, s - 2));
      if (e.key === ']') setSize((s) => Math.min(80, s + 2));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawer]);

  const cursorClass = useMemo(() => {
    if (!isDrawer) return 'cursor-not-allowed';
    if (tool === 'fill') return 'cursor-cell';
    return 'cursor-crosshair';
  }, [isDrawer, tool]);

  return (
    <div className={clsx('relative flex h-full w-full flex-col gap-3', className)}>
      <div
        ref={wrapRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={clsx(
            'rounded-2xl bg-white shadow-soft touch-none',
            cursorClass,
            !isDrawer && 'pointer-events-none',
          )}
          style={{ aspectRatio: `${VIRTUAL_W}/${VIRTUAL_H}` }}
        />
        {!isDrawer && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-ink-900/80 px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur">
            👀 watching
          </div>
        )}
        <CursorPresence canvasRef={canvasRef} virtualW={VIRTUAL_W} virtualH={VIRTUAL_H} />
        <ReactionLayer canvasRef={canvasRef} />
      </div>

      {/* Toolbar */}
      {isDrawer && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/10 bg-ink-800 p-2 shadow-soft sm:gap-3 sm:p-3">
          {/* Tools */}
          <div className="flex gap-1">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={`${t.label} (${t.key.toUpperCase()})`}
                onClick={() => setTool(t.id)}
                className={clsx(
                  'h-9 w-9 rounded-xl border text-lg transition active:translate-y-px sm:h-10 sm:w-10 sm:text-xl',
                  tool === t.id
                    ? 'border-dank-pink bg-dank-pink/15 shadow-glow'
                    : 'border-white/10 bg-white/5 hover:bg-white/10',
                )}
              >
                {t.icon}
              </button>
            ))}
          </div>
          {/* Palette */}
          <div className="flex flex-wrap gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('pen');
                }}
                className={clsx(
                  'h-7 w-7 rounded-lg border-2 transition sm:h-8 sm:w-8',
                  color === c && tool !== 'eraser' ? 'border-white scale-110' : 'border-black/20',
                )}
                style={{ backgroundColor: c }}
                aria-label={`color ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') setTool('pen');
              }}
              className="h-7 w-7 cursor-pointer rounded-lg border-2 border-black/20 sm:h-8 sm:w-8"
              aria-label="custom color"
            />
          </div>
          {/* Size */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={2}
              max={50}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="dank-range h-2 w-24 sm:w-32"
              aria-label="brush size"
            />
            <div
              className="rounded-full"
              style={{
                width: Math.min(size, 28),
                height: Math.min(size, 28),
                background: tool === 'eraser' ? '#fff' : color,
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />
          </div>
          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => getSocket().emit('stroke:undo')}
              className="btn-secondary h-9 px-3 text-xs sm:h-10 sm:text-sm"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={() => {
                if (confirm('Clear the canvas?')) getSocket().emit('canvas:clear');
              }}
              className="btn-secondary h-9 px-3 text-xs sm:h-10 sm:text-sm"
            >
              🗑 Clear
            </button>
          </div>
          <div className="hidden text-[11px] text-white/40 lg:block">
            B/M/E/F · [ / ] size · Ctrl+Z undo
          </div>
        </div>
      )}
      {/* Scale indicator (debug-ish, kept subtle for mobile) */}
      <div className="sr-only">{Math.round(scale * 100)}%</div>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function renderStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 0) return;
  if (s.tool === 'fill') {
    const seed = s.points[0]!;
    floodFill(ctx, seed[0], seed[1], s.color);
    return;
  }
  if (s.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawFreehand(ctx, s);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = s.color;
  if (s.tool === 'marker') ctx.globalAlpha = 0.55;
  drawFreehand(ctx, s);
  ctx.restore();
}

/**
 * Scanline flood fill from (vx, vy) in virtual coordinates with the target
 * hex color. Operates on raw pixel data (so we have to undo the canvas's
 * dpr-scaled transform), then putImageData back. Stack-safe — uses an array
 * of (x, y) seed pairs rather than recursion.
 */
function floodFill(ctx: CanvasRenderingContext2D, vx: number, vy: number, hex: string) {
  const dpr = window.devicePixelRatio || 1;
  const x0 = Math.round(vx * dpr);
  const y0 = Math.round(vy * dpr);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;

  // Read pixels in raw coordinates — the dpr transform doesn't apply to ImageData.
  const prevTransform = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const seedI = (y0 * w + x0) * 4;
  const sr = d[seedI]!;
  const sg = d[seedI + 1]!;
  const sb = d[seedI + 2]!;
  const sa = d[seedI + 3]!;

  const tr = parseInt(hex.slice(1, 3), 16);
  const tg = parseInt(hex.slice(3, 5), 16);
  const tb = parseInt(hex.slice(5, 7), 16);

  // No-op if the pixel is already that exact color.
  if (sr === tr && sg === tg && sb === tb && sa === 255) {
    ctx.setTransform(prevTransform);
    return;
  }

  const matches = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return d[i] === sr && d[i + 1] === sg && d[i + 2] === sb && d[i + 3] === sa;
  };
  const set = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    d[i] = tr;
    d[i + 1] = tg;
    d[i + 2] = tb;
    d[i + 3] = 255;
  };

  // Scanline flood. Push (x, y) seed pairs as flat numbers.
  const stack: number[] = [x0, y0];
  while (stack.length > 0) {
    const py = stack.pop()!;
    const px = stack.pop()!;
    if (!matches(px, py)) continue;

    let lx = px;
    while (lx > 0 && matches(lx - 1, py)) lx--;
    let rx = px;
    while (rx < w - 1 && matches(rx + 1, py)) rx++;

    let spanAbove = false;
    let spanBelow = false;
    for (let x = lx; x <= rx; x++) {
      set(x, py);
      if (py > 0) {
        if (matches(x, py - 1)) {
          if (!spanAbove) {
            stack.push(x, py - 1);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }
      if (py < h - 1) {
        if (matches(x, py + 1)) {
          if (!spanBelow) {
            stack.push(x, py + 1);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  ctx.setTransform(prevTransform);
}

function drawFreehand(ctx: CanvasRenderingContext2D, s: Stroke) {
  const opts = {
    size: s.size,
    thinning: s.tool === 'marker' ? 0.1 : 0.55,
    smoothing: 0.55,
    streamline: 0.45,
    easing: (t: number) => t,
    last: true,
  };
  const points = s.points.length === 1 ? [s.points[0]!, s.points[0]!] : s.points;
  const stroke = getStroke(points as [number, number, number][], opts);
  if (stroke.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(stroke[0]![0], stroke[0]![1]);
  for (let i = 1; i < stroke.length; i++) {
    const [x, y] = stroke[i]!;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// Limit stroke length on the wire by chunking: enforced server-side via GAME_LIMITS.
void GAME_LIMITS;
