import { motion } from 'framer-motion';
import { useCameraStore } from '../../store/camera-store';

const EXPRESSION_EMOJI = {
  confident: '😎',
  smiling: '😊',
  tense: '😬',
  neutral: '😐',
};

function MetricRow({ icon, label, value, unit = '%', color, maxValue = 100 }) {
  const pct = typeof maxValue === 'number' ? Math.min(100, (value / maxValue) * 100) : 0;
  const showBar = unit === '%';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#e0e0e6',
        }}
      >
        <span>
          {icon} {label}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#fff', fontWeight: 600 }}>
          {value}
          {unit}
        </span>
      </div>
      {showBar && (
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              height: '100%',
              borderRadius: 3,
              background: color || 'linear-gradient(90deg, #667eea, #764ba2)',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function BodyLanguageHUD({ compact = false }) {
  const { 
    eyeContact = 0, 
    posture = 0, 
    gestureCount = 0, 
    expression = 'neutral', 
    nervousHabits = 0, 
    isLoading = false 
  } = useCameraStore();

  if (isLoading) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: '#86868b',
          fontSize: 13,
        }}
      >
        Loading body language models...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      style={{
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: compact ? 14 : 20,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 14,
        minWidth: compact ? 200 : 260,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#86868b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Body Language
      </div>

      <MetricRow
        icon="👁️"
        label="Eye Contact"
        value={eyeContact}
        color={
          eyeContact >= 70
            ? '#34d399'
            : eyeContact >= 40
              ? '#fbbf24'
              : '#ef4444'
        }
      />

      <MetricRow
        icon="🧍"
        label="Posture"
        value={posture}
        color={
          posture >= 70
            ? '#34d399'
            : posture >= 40
              ? '#fbbf24'
              : '#ef4444'
        }
      />

      {/* Expression — label only, no bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#e0e0e6',
        }}
      >
        <span>😊 Expression</span>
        <span style={{ fontWeight: 600, color: '#fff' }}>
          {EXPRESSION_EMOJI[expression] || '😐'} {expression}
        </span>
      </div>

      {/* Gestures count */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#e0e0e6',
        }}
      >
        <span>🤲 Gestures</span>
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: '#667eea',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {gestureCount}
        </span>
      </div>

      {/* Nervous habits */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#e0e0e6',
        }}
      >
        <span>⚠️ Nervous Habits</span>
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: nervousHabits > 5 ? '#ef4444' : nervousHabits > 2 ? '#fbbf24' : '#34d399',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {nervousHabits}
        </span>
      </div>
    </motion.div>
  );
}
