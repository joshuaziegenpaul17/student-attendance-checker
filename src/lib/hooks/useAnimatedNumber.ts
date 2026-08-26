'use client';

import { useState, useEffect, useRef } from 'react';

export function useAnimatedNumber(
  target: number,
  duration: number = 1000,
  delay: number = 0,
  enabled: boolean = true
): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const [prev, setPrev] = useState({ target, enabled });
  const frameRef = useRef<number>(0);

  if (target !== prev.target || enabled !== prev.enabled) {
    setPrev({ target, enabled });
    setValue(enabled ? 0 : target);
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * target);
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay, enabled]);

  return value;
}
