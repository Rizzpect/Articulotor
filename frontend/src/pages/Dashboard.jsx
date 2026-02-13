import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { MetricBar } from '../components/ui/MetricBar';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { ShimmerLoader } from '../components/ui/ShimmerLoader';
import { PremiumStatCard } from '../components/ui/PremiumStatCard';
import { Icon, Mic, Chat, ArrowRight, Sparkle } from '../components/ui/Icon';
import { getDashboard, fetchScenarios } from '../lib/api';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), fetchScenarios()])
      .then(([dashData, scens]) => {
        setData(dashData);
        setScenarios(scens);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        padding: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          <ShimmerLoader width="30%" height={32} borderRadius={8} />
          <div style={{ height: 24 }} />
          <ShimmerLoader width="100%" height={120} borderRadius={20} />
          <div style={{ height: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <ShimmerLoader height={160} borderRadius={20} />
            <ShimmerLoader height={160} borderRadius={20} />
            <ShimmerLoader height={160} borderRadius={20} />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.total_sessions === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: 400, position: 'relative', zIndex: 1 }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="Sparkle" size={36} color="#667eea" />
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 12,
            }}
          >
            Begin Your Journey
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            Start your first communication session and track your progress toward mastery.
          </p>
          <GradientButton onClick={() => navigate('/')}>
            <Icon name="ArrowRight" size={16} />
            Start Training
          </GradientButton>
        </motion.div>
      </div>
    );
  }

  const getScenarioTitle = (id) => {
    const s = scenarios.find((sc) => sc.id === id);
    return s?.title || id;
  };

  const skillProgression = data.skill_progression || {};
  const crutchWords = data.crutch_words || {};
  const recentSessions = data.recent_sessions || [];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      paddingBottom: 60,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: 500,
        height: 500,
        background: 'radial-gradient(circle, rgba(118,75,162,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ maxWidth: 900, position: 'relative', zIndex: 1 }}>
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(102,126,234,0.3)',
              }}
            >
              <Icon name="Sparkle" size={18} color="#fff" />
            </div>
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              Articulotor
            </span>
          </div>
          <GradientButton size="sm" onClick={() => navigate('/')}>
            <Icon name="ArrowRight" size={14} />
            New Session
          </GradientButton>
        </motion.header>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 32 }}
        >
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 4,
            }}
          >
            Welcome back.
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>
            Your communication training progress.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.1) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: '24px 28px',
            marginBottom: 28,
            border: '1px solid rgba(102,126,234,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea20, #764ba220)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="Flame" size={24} color="#fbbf24" />
          </motion.div>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 24,
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              {data.current_streak} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>sessions</span>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Keep the momentum going
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <PremiumStatCard
            label="Avg Score"
            value={data.avg_score}
            icon="Target"
            color="#667eea"
            delay={0}
          />
          <PremiumStatCard
            label="Hours"
            value={data.total_hours_spoken}
            suffix="h"
            icon="Chart"
            color="#764ba2"
            delay={0.1}
          />
          <PremiumStatCard
            label="Sessions"
            value={data.total_sessions}
            icon="Flame"
            color="#f97316"
            delay={0.2}
          />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginBottom: 32 }}
        >
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 16,
            }}
          >
            Skill Progression
          </h2>
          <GlassCard glass style={{ padding: 24 }}>
            <MetricBar
              label="Clarity"
              value={skillProgression.clarity || 0}
              delay={0.6}
              color="linear-gradient(90deg, #667eea, #764ba2)"
            />
            <MetricBar
              label="Structure"
              value={skillProgression.structure || 0}
              delay={0.7}
              color="linear-gradient(90deg, #667eea, #3b82f6)"
            />
            <MetricBar
              label="Persuasiveness"
              value={skillProgression.persuasiveness || 0}
              delay={0.8}
              color="linear-gradient(90deg, #764ba2, #ec4899)"
            />
            <MetricBar
              label="Vocabulary"
              value={skillProgression.vocabulary || 0}
              delay={0.9}
              color="linear-gradient(90deg, #06b6d4, #667eea)"
            />
          </GlassCard>
        </motion.section>

        {Object.keys(crutchWords).length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{ marginBottom: 32 }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 16,
              }}
            >
              Words to Watch
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(crutchWords)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([word, count], i) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 12,
                      padding: '10px 16px',
                      border: '1px solid rgba(244,63,94,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#ffffff',
                      }}
                    >
                      "{word}"
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#f43f5e',
                        background: 'rgba(244,63,94,0.15)',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {count}×
                    </span>
                  </motion.div>
                ))}
            </div>
          </motion.section>
        )}

        {recentSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 16,
              }}
            >
              Recent Sessions
            </h2>
            <GlassCard glass style={{ padding: 0, overflow: 'hidden' }}>
              {recentSessions.map((session, i) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/feedback/${session.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: i < recentSessions.length - 1
                      ? '1px solid rgba(255,255,255,0.06)'
                      : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#ffffff',
                      }}
                    >
                      {getScenarioTitle(session.scenario_id)}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 2,
                      }}
                    >
                      {session.mode === 'voice' ? <Icon name="Mic" size={12} /> : <Icon name="Chat" size={12} />}
                      {' '}{session.turns} turns • {session.duration_minutes}min
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 16,
                      fontWeight: 500,
                      color: session.score >= 75 ? '#34d399' : session.score >= 50 ? '#fbbf24' : '#f43f5e',
                    }}
                  >
                    {session.score}/100
                  </div>
                </div>
              ))}
            </GlassCard>
          </motion.section>
        )}
      </div>
    </div>
  );
}
