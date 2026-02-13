import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ScoreRing } from '../components/ui/ScoreRing';
import { MetricBar } from '../components/ui/MetricBar';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { GradientButton } from '../components/ui/GradientButton';
import { GlassCard } from '../components/ui/GlassCard';
import { Confetti } from '../components/ui/Confetti';
import { ShimmerLoader } from '../components/ui/ShimmerLoader';
import { getFeedback } from '../lib/api';
import { useAppStore } from '../store/app-store';

const revealVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.3, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },
};

export default function FeedbackView() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { resetSession } = useAppStore();

  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    getFeedback(sessionId)
      .then((data) => {
        if (data.error) {
          console.error('Feedback error:', data.error);
          setFeedback(null);
        } else {
          setFeedback(data);
          if (data.overall_score >= 90) {
            confettiTimeoutRef.current = setTimeout(() => setShowConfetti(true), 2000);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, [sessionId]);

  const handleNewSession = () => {
    resetSession();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ padding: 40 }}>
        <div className="container" style={{ maxWidth: 640, textAlign: 'center' }}>
          <ShimmerLoader width={160} height={160} borderRadius="50%" />
          <div style={{ height: 32 }} />
          <ShimmerLoader width="60%" height={20} />
          <div style={{ height: 16 }} />
          <ShimmerLoader width="80%" height={14} count={3} />
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="page-wrapper" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#86868b', fontFamily: "'Inter', sans-serif" }}>
          Could not load feedback.
        </p>
        <GradientButton onClick={() => navigate('/')} style={{ marginTop: 16 }}>
          Go Home
        </GradientButton>
      </div>
    );
  }

  const score = feedback.overall_score || 0;
  const strengths = feedback.strengths || [];
  const improvements = feedback.improvements || [];
  const fillerWords = Array.isArray(feedback.filler_words) ? feedback.filler_words : [];
  const turnCount = feedback.turn_count || 0;
  const closingMessage = feedback.closing_message || '';
  const sub = feedback.sub_scores || {};
  const subScores = [
    { label: 'Clarity', value: sub.clarity || 0, icon: '🎯' },
    { label: 'Structure', value: sub.structure || 0, icon: '📐' },
    { label: 'Persuasion', value: sub.persuasiveness || 0, icon: '💡' },
    { label: 'Vocabulary', value: sub.vocabulary || 0, icon: '📚' },
  ];

  const motivationalText =
    score >= 90
      ? 'Outstanding performance! 🎉'
      : score >= 75
        ? 'Great job! Keep pushing. 💪'
        : score >= 50
          ? 'Good effort! Room to grow. 📈'
          : "Keep practicing — you'll get there. 🌱";

  return (
    <div className="page-wrapper" style={{ paddingBottom: 80 }}>
      <Confetti trigger={showConfetti} />

      <div className="container" style={{ maxWidth: 640 }}>
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 48,
          }}
        >
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 32 }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: '#86868b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ✨ Session Complete
            </span>
          </motion.div>

          <motion.div variants={scaleIn} style={{ marginBottom: 16 }}>
            <ScoreRing score={score} size={180} strokeWidth={12} />
          </motion.div>

          <motion.p
            variants={fadeUp}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              color: '#1d1d1f',
              fontWeight: 500,
              marginBottom: 40,
            }}
          >
            {motivationalText}
          </motion.p>

          <motion.div
            variants={fadeUp}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              width: '100%',
              marginBottom: 32,
            }}
          >
            {subScores.map((s) => (
              <motion.div
                key={s.label}
                variants={scaleIn}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 28,
                    fontWeight: 500,
                    color: '#1d1d1f',
                    marginBottom: 4,
                  }}
                >
                  <AnimatedCounter target={s.value} duration={1.2} />
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: '#86868b',
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {strengths.length > 0 && (
            <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 24 }}>
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#86868b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 12,
                }}
              >
                Strengths
              </h3>
              {strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.0 + i * 0.1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 10,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    color: '#1d1d1f',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#34d399', flexShrink: 0 }}>✅</span>
                  {s}
                </motion.div>
              ))}
            </motion.div>
          )}

          {improvements.length > 0 && (
            <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 32 }}>
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#86868b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 12,
                }}
              >
                Areas to Improve
              </h3>
              {improvements.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.5 + i * 0.1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 10,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    color: '#1d1d1f',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: '#fbbf24', flexShrink: 0 }}>🔸</span>
                  {s}
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: '#86868b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 16,
              }}
            >
              Performance Metrics
            </h3>
            <MetricBar
              label="Clarity"
              value={sub.clarity || 0}
              delay={2.8}
              color="linear-gradient(135deg, #667eea, #764ba2)"
            />
            <MetricBar
              label="Structure"
              value={sub.structure || 0}
              delay={3.0}
              color="linear-gradient(135deg, #667eea, #3b82f6)"
            />
            <MetricBar
              label="Persuasiveness"
              value={sub.persuasiveness || 0}
              delay={3.2}
              color="linear-gradient(135deg, #764ba2, #ec4899)"
            />
            {sub.vocabulary != null && (
              <MetricBar
                label="Vocabulary"
                value={sub.vocabulary}
                delay={3.4}
                color="linear-gradient(135deg, #06b6d4, #667eea)"
              />
            )}
          </motion.div>

          <motion.div variants={fadeUp} style={{ width: '100%', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {turnCount > 0 && (
              <div
                style={{
                  background: 'rgba(102,126,234,0.06)',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: '#667eea',
                  fontWeight: 500,
                  border: '1px solid rgba(102,126,234,0.12)',
                }}
              >
                💬 {turnCount} conversation turn{turnCount !== 1 ? 's' : ''}
              </div>
            )}
            {fillerWords.length > 0 && (
              <div
                style={{
                  background: 'rgba(244,63,94,0.06)',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: '#f43f5e',
                  fontWeight: 500,
                  border: '1px solid rgba(244,63,94,0.12)',
                }}
              >
                ⚠️ {fillerWords.length} filler word{fillerWords.length !== 1 ? 's' : ''}: {[...new Set(fillerWords)].slice(0, 5).map(w => `"${w}"`).join(', ')}
              </div>
            )}
          </motion.div>

          {closingMessage && (
            <motion.div
              variants={fadeUp}
              style={{
                width: '100%',
                marginBottom: 32,
                background: 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.04) 100%)',
                borderRadius: 16,
                padding: '20px 24px',
                border: '1px solid rgba(102,126,234,0.1)',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#667eea',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 10,
                }}
              >
                🤖 AI Coach Feedback
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: '#1d1d1f',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {closingMessage}
              </p>
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            style={{
              display: 'flex',
              gap: 12,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <GradientButton variant="secondary" onClick={() => navigate(-1)}>
              Practice Again
            </GradientButton>
            <GradientButton onClick={handleNewSession}>
              New Scenario →
            </GradientButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
