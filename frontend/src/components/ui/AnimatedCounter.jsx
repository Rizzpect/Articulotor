import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

export function AnimatedCounter({ target, duration = 1.5, prefix = '', suffix = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, target, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return controls.stop;
  }, [target, duration, count]);

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
