'use client';
import { useState, useEffect, useRef } from 'react';

export function AnimatedCounter({ target, duration = 500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (target === 0) { setValue(0); return; }
    started.current = true;
    let start: number | null = null;
    let raf: number;
    const step = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return <>{value}</>;
}
