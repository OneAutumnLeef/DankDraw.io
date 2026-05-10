import { motion } from 'framer-motion';

export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      <div className="absolute inset-0 grain opacity-60" />
      <motion.div
        aria-hidden
        className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-dank-pink/30 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/2 -right-40 h-[36rem] w-[36rem] rounded-full bg-dank-sky/30 blur-[120px]"
        animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-0 left-1/4 h-[28rem] w-[28rem] rounded-full bg-dank-mint/20 blur-[120px]"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 stripes opacity-40" />
    </div>
  );
}
