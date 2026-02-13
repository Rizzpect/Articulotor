import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { GradientButton } from '../components/ui/GradientButton';
import { ModeToggle } from '../components/ui/ModeToggle';
import { ShimmerLoader } from '../components/ui/ShimmerLoader';
import { fetchScenarios, generateCustomScenario, createSession } from '../lib/api';
import { useAppStore } from '../store/app-store';
import { CATEGORY_ICONS, DIFFICULTY_COLORS } from '../lib/constants';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const { mode, setMode, setCurrentSession, setCurrentScenario } = useAppStore();

  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [starting, setStarting] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch((err) => {
        console.error(err);
        setErrorMsg('Failed to load scenarios. Is the backend running?');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (scenarioId) => {
    setStarting(true);
    setErrorMsg(null);
    try {
      const data = await createSession(scenarioId, mode, 'naval');
      setCurrentSession(data);
      setCurrentScenario(data.scenario);
      const routes = { chat: '/chat', voice: '/voice', camera: '/camera' };
      navigate(routes[mode] || '/chat');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to start session. Is the backend running?');
      setSelectedId(null);
    } finally {
      setStarting(false);
    }
  };

  const handleCustomScenario = async () => {
    if (!customPrompt.trim() || customPrompt.length < 10) return;
    setCustomLoading(true);
    setErrorMsg(null);
    try {
      const scenario = await generateCustomScenario(customPrompt);
      const data = await createSession(scenario.id, mode, 'naval');
      setCurrentSession(data);
      setCurrentScenario(data.scenario);
      const routes = { chat: '/chat', voice: '/voice', camera: '/camera' };
      navigate(routes[mode] || '/chat');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create custom scenario. Please try again.');
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ paddingBottom: 80, minHeight: '100vh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, right: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(118,75,162,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                boxShadow: '0 0 20px rgba(102,126,234,0.3)',
              }}
            />
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
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <Icon name="Chart" size={16} style={{ marginRight: 6 }} />
            Dashboard
          </GradientButton>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ textAlign: 'center', padding: '40px 0 48px' }}
        >
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Your communication{' '}
            <span className="gradient-text">gym.</span>
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              color: 'rgba(255,255,255,0.55)',
              maxWidth: 460,
              margin: '0 auto 40px',
              lineHeight: 1.6,
            }}
          >
            Practice. Get real-time AI feedback. Improve.
          </p>

          <ModeToggle mode={mode} onModeChange={setMode} />
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Choose a scenario
          </span>
        </motion.div>

        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  padding: 24,
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <ShimmerLoader width="60%" height={16} borderRadius={8} />
                <div style={{ height: 12 }} />
                <ShimmerLoader width="90%" height={12} borderRadius={6} />
                <div style={{ height: 8 }} />
                <ShimmerLoader width="40%" height={12} borderRadius={6} />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {scenarios.map((scenario) => (
              <motion.div key={scenario.id} variants={itemVariants}>
                <GlassCard
                  glass={true}
                  onClick={() => {
                    setSelectedId(scenario.id);
                    handleStart(scenario.id);
                  }}
                  selected={selectedId === scenario.id}
                  style={{
                    opacity: selectedId && selectedId !== scenario.id ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <Icon name={CATEGORY_ICONS[scenario.category] || 'Sparkle'} size={24} style={{ color: '#667eea' }} />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: DIFFICULTY_COLORS[scenario.difficulty] || '#86868b',
                        background:
                          scenario.difficulty === 'Easy'
                            ? 'rgba(52,211,153,0.1)'
                            : scenario.difficulty === 'Medium'
                              ? 'rgba(251,191,36,0.1)'
                              : 'rgba(244,63,94,0.1)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {scenario.difficulty}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#ffffff',
                      marginBottom: 6,
                    }}
                  >
                    {scenario.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.5,
                      marginBottom: 8,
                    }}
                  >
                    {scenario.description}
                  </p>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: '#aeaeb2',
                    }}
                  >
                    {scenario.category}
                  </span>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 48, textAlign: 'center' }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            or describe your own situation
          </span>
          <div
            style={{
              maxWidth: 560,
              margin: '16px auto 0',
              display: 'flex',
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomScenario()}
                placeholder="I have a pitch meeting with investors tomorrow..."
                style={{
                  width: '100%',
                  fontSize: 15,
                  color: '#ffffff',
                  fontFamily: "'Inter', sans-serif",
                  background: 'transparent',
                  outline: 'none',
                }}
              />
            </div>
            <GradientButton
              onClick={handleCustomScenario}
              disabled={customLoading || customPrompt.length < 10}
              size="md"
            >
              {customLoading ? '...' : 'Go →'}
            </GradientButton>
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(244,63,94,0.95)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
              padding: '14px 24px',
              borderRadius: 14,
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              zIndex: 60,
              boxShadow: '0 8px 32px rgba(244,63,94,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              maxWidth: 440,
            }}
          >
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              style={{ color: '#fff', fontWeight: 700, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {starting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif", fontSize: 15 }}>
              Setting up your session...
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
