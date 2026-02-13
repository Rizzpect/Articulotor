import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function GradientButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  icon,
  style = {},
  ...props
}) {
  const [ripple, setRipple] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes ripple-anim {
        to { transform: scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  const handleClick = (e) => {
    if (disabled) return;

    // Ripple effect
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, key: Date.now() });
    setTimeout(() => setRipple(null), 600);

    onClick?.(e);
  };

  const sizes = {
    sm: { padding: '10px 20px', fontSize: 13 },
    md: { padding: '14px 32px', fontSize: 15 },
    lg: { padding: '18px 40px', fontSize: 16 },
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      border: 'none',
    },
    secondary: {
      background: '#ffffff',
      color: '#1d1d1f',
      border: '1px solid rgba(0,0,0,0.1)',
    },
    ghost: {
      background: 'transparent',
      color: '#667eea',
      border: '1px solid rgba(102,126,234,0.2)',
    },
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <motion.button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -1, boxShadow: '0 4px 20px rgba(102,126,234,0.25)' }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{
        ...v,
        ...s,
        borderRadius: 12,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: fullWidth ? '100%' : 'auto',
        minHeight: 44,
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
      {ripple && (
        <span
          key={ripple.key}
          style={{
            position: 'absolute',
            left: ripple.x - 50,
            top: ripple.y - 50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            transform: 'scale(0)',
            animation: 'ripple-anim 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.button>
  );
}
