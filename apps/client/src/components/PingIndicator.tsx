import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * Round-trip latency probe. Pings the server every 4 s and shows the median
 * of the last 5 samples. Coloured by quality so you can tell at a glance
 * whether sluggishness is the network (high ping) vs. the server CPU.
 */
export function PingIndicator() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const samples: number[] = [];
    let cancelled = false;

    const probe = () => {
      const sock = getSocket();
      if (!sock.connected) return;
      const sent = performance.now();
      sock.timeout(2000).emit('ping', () => {
        if (cancelled) return;
        const rtt = performance.now() - sent;
        samples.push(rtt);
        if (samples.length > 5) samples.shift();
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? rtt;
        setMs(Math.round(median));
      });
    };

    probe();
    const id = setInterval(probe, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (ms === null) return null;
  const colorClass =
    ms < 80
      ? 'text-dank-mint border-dank-mint/40 bg-dank-mint/10'
      : ms < 200
      ? 'text-white border-white/20 bg-white/5'
      : ms < 400
      ? 'text-dank-sun border-dank-sun/40 bg-dank-sun/10'
      : 'text-dank-coral border-dank-coral/40 bg-dank-coral/10';

  return (
    <span
      className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${colorClass}`}
      title={`round-trip to server: ${ms} ms`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ms} ms
    </span>
  );
}
