import { motion } from 'framer-motion';

export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      <div className="absolute inset-0 grain opacity-60" />
      <motion.div
        aria-hidden
        className="absolute -top-60 -left-60 h-[36rem] w-[36rem] rounded-full bg-dank-pink/12 blur-[140px]"
        animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/2 -right-60 h-[32rem] w-[32rem] rounded-full bg-dank-sky/12 blur-[140px]"
        animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-dank-mint/10 blur-[140px]"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 stripes opacity-40" />
    </div>
  );
}
