import { memo } from 'react';

/**
 * Icon - Custom SVG icon system to replace emojis
 * Premium, consistent iconography throughout the app
 */

const icons = {
  // Navigation & Actions
  ArrowLeft: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ArrowRight: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronDown: (props) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Close: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Send: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M3.5 10L16.5 3.5L9.5 16.5L8.5 10.5L3.5 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),

  // Communication Modes
  Chat: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M21 11.5C21 16.194 16.971 20 12 20C9.5 20 7.5 18.5 6 17V8L3 5L4 8C4 8 5 8 6 8C9.5 8 12 6 12 6C12 6 14.5 8 18 8C20 8 21 9.5 21 11.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10H14M8 14H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Mic: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 18V22M8 22H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  MicActive: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 10V11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 18V22M8 22H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="11" r="2.5" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  Video: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M17 10L22 7V17L17 14V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  // Stats & Metrics
  Target: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  ),
  Chart: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 20V14M8 20V8M13 20V4M18 20V12M23 20V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  TrendUp: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M3 14L7 10L11 13L17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 6H17V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  TrendDown: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M3 6L7 10L11 7L17 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 14H17V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Flame: (props) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2C12 2 8 6 8 10C8 14 12 18 12 22C12 18 16 14 16 10C16 6 12 2 12 2Z" fill="currentColor" opacity="0.3"/>
      <path d="M12 2C12 2 9 5.5 9 8.5C9 11.5 12 14 12 18C12 14 15 11.5 15 8.5C15 5.5 12 2 12 2Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Clock: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 5V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Play: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M6 4L15 10L6 16V4Z" fill="currentColor"/>
    </svg>
  ),

  // Body Language
  Eye: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M1.5 10C1.5 10 4.5 4 10 4C15.5 4 18.5 10 18.5 10C18.5 10 15.5 16 10 16C4.5 16 1.5 10 1.5 10Z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Person: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  PersonStanding: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 9H13M10 9V17M8 17H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Hand: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M15 7V4C15 3 14 2 13 2C12 2 11 3 11 4V7M11 7V10M11 10V13M11 13V16M7 16V11C7 10 8 9 9 9C10 9 11 10 11 11V16M3 16V12C3 11 4 10 5 10C6 10 7 11 7 12V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Warning: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M10 2L1 18H19L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 8V11M10 14V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Check: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Star: (props) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M10 2L12.5 7.5L19 8.5L14.5 12.5L15.5 19L10 16L4.5 19L5.5 12.5L1 8.5L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),

  // Premium UI
  Sparkle: (props) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" fill="currentColor"/>
    </svg>
  ),
  Logo: (props) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="14" fill="url(#logoGrad)"/>
      <circle cx="16" cy="16" r="8" fill="#0a0a0f" opacity="0.4"/>
      <circle cx="16" cy="14" r="3" fill="#fff" opacity="0.8"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#667eea"/>
          <stop offset="100%" stopColor="#764ba2"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  Orb: (props) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="14" stroke="url(#orbGrad)" strokeWidth="2"/>
      <circle cx="16" cy="16" r="8" fill="#0a0a0f" opacity="0.3"/>
      <circle cx="14" cy="14" r="3" fill="#fff" opacity="0.6"/>
      <defs>
        <linearGradient id="orbGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#667eea"/>
          <stop offset="100%" stopColor="#764ba2"/>
        </linearGradient>
      </defs>
    </svg>
  ),
};

/**
 * Icon component - renders the specified icon
 */
export const Icon = memo(function Icon({ name, size = 20, color = 'currentColor', style, ...props }) {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: size,
        height: size,
        color,
        ...style 
      }}
      {...props}
    >
      <IconComponent width={size} height={size} />
    </span>
  );
});

// Export individual icons for direct usage
export const {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Plus,
  Close,
  Send,
  Chat,
  Mic,
  MicActive,
  Video,
  Target,
  Chart,
  TrendUp,
  TrendDown,
  Flame,
  Clock,
  Play,
  Eye,
  Person,
  PersonStanding,
  Hand,
  Warning,
  Check,
  Star,
  Sparkle,
  Logo,
  Orb,
} = icons;
