import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { Icon } from './Icon';

export function PremiumStatCard({ 
  label, 
  value, 
  suffix = '', 
  trend,
  icon = 'Chart',
  color = '#667eea',
  delay = 0 
}) {
  const percentage = Math.min(100, Math.max(0, value));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay, 
        type: 'spring', 
        stiffness: 300, 
        damping: 20 
      }}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Progress Ring */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="4"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 150.8} 150.8`}
            style={{ 
              transition: 'stroke-dasharray 1s ease-out',
              filter: `drop-shadow(0 0 6px ${color}40)`
            }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Icon name={icon} size={22} color={color} />
        </div>
      </div>

      {/* Value */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28,
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1,
        }}>
          <AnimatedCounter target={value} duration={1.2} />
        </span>
        {suffix && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
          }}>
            {suffix}
          </span>
        )}
      </div>

      {/* Label */}
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </span>

      {/* Trend */}
      {trend !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
        }}>
          {trend >= 0 ? (
            <Icon name="TrendUp" size={14} color="#34d399" />
          ) : (
            <Icon name="TrendDown" size={14} color="#f43f5e" />
          )}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: trend >= 0 ? '#34d399' : '#f43f5e',
          }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}

      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        background: `linear-gradient(180deg, ${color}10 0%, transparent 100%)`,
        pointerEvents: 'none',
      }} />
    </motion.div>
  );
}
