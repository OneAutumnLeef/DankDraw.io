import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';

export function WaitingForWord() {
  const state = useGame((s) => s.state)!;
  const drawer = state.players.find((p) => p.id === state.drawerId);
  if (!drawer) return null;

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel flex flex-col items-center gap-4 px-10 py-12 text-center"
      >
        <motion.div
          className="text-7xl"
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {drawer.avatar}
        </motion.div>
        <div className="font-display text-2xl text-white">{drawer.name} is choosing a word</div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-dank-pink"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
