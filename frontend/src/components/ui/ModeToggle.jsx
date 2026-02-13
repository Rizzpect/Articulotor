import { motion } from 'framer-motion';

const MODES = [
  { key: 'chat', icon: '💬', label: 'Chat' },
  { key: 'voice', icon: '🎤', label: 'Voice' },
  { key: 'camera', icon: '📷', label: 'Camera' },
];

export function ModeToggle({ mode, onModeChange }) {
  const validMode = MODES.find(m => m.key === mode)?.key || MODES[0].key;
  const activeIndex = MODES.findIndex((m) => m.key === validMode);
  const count = MODES.length;

  return (
    <div
      style={{
        display: 'inline-flex',
        background: '#f0f0f2',
        borderRadius: 14,
        padding: 4,
        position: 'relative',
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onModeChange(m.key)}
          style={{
            position: 'relative',
            padding: '12px 24px',
            borderRadius: 10,
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: validMode === m.key ? '#ffffff' : '#86868b',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1,
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 110,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 18 }}>{m.icon}</span>
          {m.label}
        </button>
      ))}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          width: `calc(${100 / count}% - 4px)`,
          left: `calc(${(100 / count) * activeIndex}% + 4px)`,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 10,
          zIndex: 0,
          boxShadow: '0 2px 12px rgba(102,126,234,0.3)',
        }}
      />
    </div>
  );
}
