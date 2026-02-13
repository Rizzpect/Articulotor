import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { VoiceOrbScene } from '../components/three/VoiceOrbScene';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { useVoiceStore } from '../store/voice-store';
import { useAppStore } from '../store/app-store';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { useTextToSpeech } from '../hooks/use-text-to-speech';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { useSilenceDetection } from '../hooks/use-silence-detection';
import { createVoiceWebSocket, endSession } from '../lib/api';

const WS_RECONNECT_BASE_MS = 1000;
const WS_RECONNECT_MAX_MS = 16000;
const WS_MAX_RETRIES = 5;

const THINKING_SLOW_THRESHOLD_MS = 4000;

export default function VoiceSession() {
  const navigate = useNavigate();
  const { currentSession, wpm, fillerCount, setWpm, setFillerCount } =
    useAppStore();
  const voiceStore = useVoiceStore();
  const { startRecording, stopRecording, analyserRef } = useAudioRecorder();
  const { speak, stop: stopSpeech } = useTextToSpeech();
  const { transcript, startListening: startSpeech, stopListening: stopSpeechRecognition, clearTranscript } = useSpeechRecognition();

  const transcriptRef = useRef('');

  const [elapsed, setElapsed] = useState(0);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [fillerFlash, setFillerFlash] = useState(false);

  const [voiceInputMode, setVoiceInputMode] = useState('push');
  const [isRecording, setIsRecording] = useState(false);

  const [isThinking, setIsThinking] = useState(false);
  const [isThinkingSlow, setIsThinkingSlow] = useState(false);
  const thinkingTimerRef = useRef(null);

  const wsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const welcomePlayedRef = useRef(false);
  const analyserAttachedRef = useRef(false);
  const [wsStatus, setWsStatus] = useState('idle');

  const isDemo = !currentSession;

  const displaySession = currentSession || { session_id: 'demo', scenario: { title: 'Voice Practice Demo' } };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDemo && !aiQuestion) {
      setAiQuestion('Tell me about a time you led a challenging project. What was the outcome?');
    }
  }, [isDemo, aiQuestion]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const startThinkingTimer = useCallback(() => {
    setIsThinking(true);
    setIsThinkingSlow(false);
    thinkingTimerRef.current = setTimeout(() => {
      setIsThinkingSlow(true);
    }, THINKING_SLOW_THRESHOLD_MS);
  }, []);

  const clearThinkingTimer = useCallback(() => {
    setIsThinking(false);
    setIsThinkingSlow(false);
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);

  const sendTranscript = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const text = transcriptRef.current.trim() || 'I understand your point and would like to respond...';
      wsRef.current.send(
        JSON.stringify({ type: 'user_audio_transcript', text })
      );
      clearTranscript();
      startThinkingTimer();
    }
  }, [clearTranscript, startThinkingTimer]);

  const handleSilenceDetected = useCallback(() => {
    if (!isHolding) return;
    setIsHolding(false);
    voiceStore.setState('processing');
    setIsThinking(true);

    stopRecording().then(() => {
      stopSpeechRecognition();
      sendTranscript();
    });
  }, [isHolding, stopSpeechRecognition, sendTranscript, stopRecording, voiceStore]);

  const { attachAnalyser, detach: detachSilence } = useSilenceDetection(
    handleSilenceDetected,
    { threshold: 0.04, durationMs: 2000 }
  );

  const connectWs = useCallback(() => {
    if (!currentSession) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
    }

    const ws = createVoiceWebSocket(currentSession.session_id);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      setWsStatus('connected');
      voiceStore.setError(null);
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
        return;
      }

      if (data.type === 'welcome') {
        const msg = data.message || data.scenario?.opening || "Let's begin.";
        setAiQuestion(msg);
        clearThinkingTimer();
        if (!welcomePlayedRef.current) {
          welcomePlayedRef.current = true;
          await speak(msg);
        }
      } else if (data.type === 'ai_response') {
        clearThinkingTimer();
        setAiQuestion(data.text);

        if (data.analysis) {
          if (data.analysis.filler_words?.length) {
            const current = useAppStore.getState();
            setFillerCount(current.fillerCount + data.analysis.filler_words.length);
            setFillerFlash(true);
            setTimeout(() => setFillerFlash(false), 600);
          }
          if (typeof data.analysis.clarity_score === 'number' && !isNaN(data.analysis.clarity_score)) {
            setWpm(data.analysis.clarity_score * 2);
          }
        }

        voiceStore.setState('processing');
        await speak(data.text);
      } else if (data.type === 'session_ended') {
        navigate(`/feedback/${currentSession.session_id}`);
      }
    };

    ws.onerror = () => {
      voiceStore.setError('Connection error');
    };

    ws.onclose = (event) => {
      if (event.code === 1000) return;

      if (reconnectCountRef.current < WS_MAX_RETRIES) {
        const delay = Math.min(
          WS_RECONNECT_BASE_MS * Math.pow(2, reconnectCountRef.current),
          WS_RECONNECT_MAX_MS
        );
        setWsStatus('reconnecting');
        reconnectCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connectWs, delay);
      } else {
        setWsStatus('failed');
        voiceStore.setError('Connection lost. Please refresh to retry.');
      }
    };
  }, [currentSession, navigate, voiceStore, speak, clearThinkingTimer, setFillerCount, setWpm]);

  useEffect(() => {
    if (!currentSession) return;

    const handleBeforeUnload = (e) => {
      if (isHolding || isRecording) {
        e.preventDefault();
        e.returnValue = 'You have an active session. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    connectWs();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(1000); } catch { /* ignore */ }
      }
      welcomePlayedRef.current = false;
      stopSpeech();
      clearThinkingTimer();
    };
  }, [currentSession, connectWs, isHolding, isRecording, stopSpeech, clearThinkingTimer]);

  const handleHoldStart = useCallback(async () => {
    setIsHolding(true);
    stopSpeech();
    clearThinkingTimer();
    voiceStore.setState('listening');
    await startRecording();
    startSpeech();

    if (analyserRef.current && !analyserAttachedRef.current) {
      analyserAttachedRef.current = true;
      attachAnalyser(analyserRef.current);
    }
  }, [startRecording, stopSpeech, voiceStore, clearThinkingTimer, analyserRef, attachAnalyser, startSpeech]);

  const handleHoldEnd = useCallback(async () => {
    if (!isHolding) return;
    setIsHolding(false);
    detachSilence();
    analyserAttachedRef.current = false;
    voiceStore.setState('processing');

    await stopRecording();
    stopSpeechRecognition();
    sendTranscript();
  }, [stopRecording, voiceStore, isHolding, detachSilence, sendTranscript, stopSpeechRecognition]);

  const handlePushToggle = useCallback(async () => {
    if (!isRecording) {
      setIsRecording(true);
      stopSpeech();
      clearThinkingTimer();
      voiceStore.setState('listening');
      await startRecording();
      startSpeech();

      if (analyserRef.current && !analyserAttachedRef.current) {
        analyserAttachedRef.current = true;
        attachAnalyser(analyserRef.current);
      }
    } else {
      setIsRecording(false);
      detachSilence();
      analyserAttachedRef.current = false;
      voiceStore.setState('processing');
      await stopRecording();
      stopSpeechRecognition();
      sendTranscript();
    }
  }, [isRecording, startRecording, stopRecording, stopSpeech, clearThinkingTimer, voiceStore, detachSilence, sendTranscript, startSpeech, stopSpeechRecognition, analyserRef, attachAnalyser]);

  const handleEnd = async () => {
    if (isHolding || isRecording) {
      const confirmed = window.confirm('You have an active session. Are you sure you want to end it?');
      if (!confirmed) return;
    }

    if (isDemo) {
      navigate('/');
      return;
    }
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end_session' }));
      }
      await endSession(currentSession.session_id);
      navigate(`/feedback/${currentSession.session_id}`);
    } catch {
      navigate(`/feedback/${currentSession.session_id}`);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentSession && !isDemo) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0d0f',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#18181b',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          onClick={handleEnd}
          style={{
            color: '#667eea',
            fontWeight: 500,
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: '#fafafa',
            }}
          >
            {displaySession.scenario?.title || '🎤 Voice Demo'}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#71717a',
            fontWeight: 500,
          }}
        >
          ⏱ {formatTime(elapsed)}
        </div>
      </motion.header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 24px 16px',
          gap: 20,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <VoiceOrbScene size={280} />
        </motion.div>

        <motion.div
          key={aiQuestion}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 18,
            color: '#fafafa',
            textAlign: 'center',
            maxWidth: 500,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          "{aiQuestion}"
        </motion.div>

        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                borderRadius: 12,
                background: isThinkingSlow
                  ? 'rgba(251,191,36,0.08)'
                  : 'rgba(102,126,234,0.06)',
                border: isThinkingSlow
                  ? '1px solid rgba(251,191,36,0.2)'
                  : '1px solid rgba(102,126,234,0.12)',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      delay: i * 0.2,
                    }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isThinkingSlow ? '#f59e0b' : '#667eea',
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isThinkingSlow ? '#b45309' : '#667eea',
                }}
              >
                {isThinkingSlow
                  ? 'Still thinking... this may take a moment'
                  : 'Thinking...'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {wsStatus === 'reconnecting' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                color: '#b45309',
                textAlign: 'center',
              }}
            >
              ⚡ Reconnecting... (attempt {reconnectCountRef.current}/{WS_MAX_RETRIES})
            </motion.div>
          )}
          {wsStatus === 'failed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(244,63,94,0.06)',
                border: '1px solid rgba(244,63,94,0.2)',
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                color: '#f43f5e',
                textAlign: 'center',
              }}
            >
              Connection lost.{' '}
              <button
                onClick={connectWs}
                style={{
                  color: '#667eea',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                }}
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          style={{
            display: 'inline-flex',
            background: '#27272a',
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[
            { key: 'push', label: 'Simple', icon: '🎙️' },
            { key: 'hold', label: 'Live', icon: '⚡' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => {
                if (isRecording || isHolding) return;
                setVoiceInputMode(m.key);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: voiceInputMode === m.key ? '#fff' : '#a1a1aa',
                background:
                  voiceInputMode === m.key
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'transparent',
                border: 'none',
                cursor: isRecording || isHolding ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {voiceInputMode === 'hold' ? (
          <motion.button
            onPointerDown={handleHoldStart}
            onPointerUp={handleHoldEnd}
            onPointerLeave={() => isHolding && handleHoldEnd()}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 200,
              height: 56,
              borderRadius: 28,
              background: isHolding
                ? 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              border: 'none',
              boxShadow: isHolding
                ? '0 0 40px rgba(244,63,94,0.3)'
                : '0 4px 20px rgba(102,126,234,0.25)',
              transition: 'background 0.3s, box-shadow 0.3s',
              position: 'relative',
            }}
          >
            {isHolding && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: 36,
                  border: '2px solid rgba(244,63,94,0.4)',
                }}
              />
            )}
            <span style={{ fontSize: 18 }}>{isHolding ? '🔴' : '🎤'}</span>
            {isHolding ? 'Release to Send' : 'Hold to Speak'}
          </motion.button>
        ) : (
          <motion.button
            onClick={handlePushToggle}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 220,
              height: 56,
              borderRadius: 28,
              background: isRecording
                ? 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              border: 'none',
              boxShadow: isRecording
                ? '0 0 40px rgba(244,63,94,0.3)'
                : '0 4px 20px rgba(102,126,234,0.25)',
              transition: 'background 0.3s, box-shadow 0.3s',
              position: 'relative',
            }}
          >
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: 36,
                  border: '2px solid rgba(244,63,94,0.4)',
                }}
              />
            )}
            <span style={{ fontSize: 18 }}>{isRecording ? '⏹️' : '🎤'}</span>
            {isRecording ? 'Tap to Send' : 'Tap to Speak'}
          </motion.button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
          {[
            { label: 'WPM', value: wpm, icon: '🗣️' },
            {
              label: 'Fillers',
              value: fillerCount,
              icon: '⚠️',
              flash: fillerFlash,
            },
            { label: 'Time', value: formatTime(elapsed), icon: '⏱️', isText: true },
          ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: '#18181b',
                  borderRadius: 14,
                  padding: '16px 24px',
                  textAlign: 'center',
                  minWidth: 90,
                  border: stat.flash
                    ? '1.5px solid rgba(244,63,94,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: stat.flash
                    ? '0 0 20px rgba(244,63,94,0.15)'
                    : '0 2px 12px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24,
                  fontWeight: 500,
                  color: '#fafafa',
                  marginBottom: 2,
                }}
              >
                {stat.isText ? (
                  stat.value
                ) : (
                  <AnimatedCounter target={stat.value} duration={0.5} />
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: '#71717a',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 24px' }}>
        <button
          onClick={handleEnd}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: '#f43f5e',
            padding: '10px 20px',
            borderRadius: 8,
            background: 'rgba(244,63,94,0.06)',
          }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}
