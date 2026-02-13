import { motion } from 'framer-motion';

export function GlassCard({
  children,
  className = '',
  hover = true,
  onClick,
  selected = false,
  glass = true,
  style = {},
  ...props
}) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={
        hover
          ? { y: -4, scale: 1.01, boxShadow: '0 20px 50px rgba(102,126,234,0.12), 0 0 0 1px rgba(102,126,234,0.2)' }
          : {}
      }
      whileTap={hover ? { scale: 0.99 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{
        background: glass 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
          : selected 
            ? 'rgba(102, 126, 234, 0.04)' 
            : 'rgba(255,255,255,0.95)',
        backdropFilter: glass ? 'blur(20px) saturate(180%)' : undefined,
        WebkitBackdropFilter: glass ? 'blur(20px) saturate(180%)' : undefined,
        borderRadius: 20,
        border: selected
          ? '1.5px solid rgba(102, 126, 234, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: selected
          ? '0 8px 32px rgba(102, 126, 234, 0.15)'
          : '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
