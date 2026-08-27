'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAnimatedNumber(
  target: number,
  duration: number = 1000,
  delay: number = 0,
  enabled: boolean = true
): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number>(0);

  const animateTo = useCallback((from: number, to: number) => {
    let cancelled = false;
    fromRef.current = from;

    const timeout = setTimeout(() => {
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(from + (to - from) * eased);
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          fromRef.current = to;
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [duration, delay]);

  useEffect(() => {
    if (!enabled) {
      return animateTo(target, target);
    }
    return animateTo(fromRef.current, target);
  }, [target, enabled, animateTo]);

  return value;
}
