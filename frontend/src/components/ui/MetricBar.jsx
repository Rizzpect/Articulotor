import { motion } from 'framer-motion';

export function MetricBar({ label, value, max = 100, color, delay = 0 }) {
  const safeMax = !max || max <= 0 || isNaN(max) ? 100 : max;
  const percentage = Math.min((value / safeMax) * 100, 100);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#1d1d1f',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 500,
            color: '#86868b',
          }}
        >
          {value}
          {safeMax === 100 ? '%' : `/${safeMax}`}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 1.2,
            delay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{
            height: '100%',
            borderRadius: 4,
            background: color || 'linear-gradient(135deg, #667eea, #764ba2)',
          }}
        />
      </div>
    </div>
  );
}
