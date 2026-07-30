'use client';
import { motion } from 'framer-motion';

const mq = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const reduced = mq?.matches ?? false;

const variants = reduced ? {
  enter: { opacity: 1 },
  center: { opacity: 1 },
  exit: { opacity: 1 },
} : {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function StageTransition({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <motion.div
      key={id}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 overflow-y-auto"
    >
      {children}
    </motion.div>
  );
}
