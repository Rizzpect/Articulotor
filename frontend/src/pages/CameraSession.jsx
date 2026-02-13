import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { VoiceOrbScene } from '../components/three/VoiceOrbScene';
import { WebcamFeed } from '../components/ui/WebcamFeed';
import { BodyLanguageHUD } from '../components/ui/BodyLanguageHUD';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { GradientButton } from '../components/ui/GradientButton';
import { useVoiceStore } from '../store/voice-store';
import { useAppStore } from '../store/app-store';
import { useCameraStore } from '../store/camera-store';
import { useBodyLanguage } from '../hooks/use-body-language';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { useTextToSpeech } from '../hooks/use-text-to-speech';
import { useSpeechRecognition } from '../hooks/use-speech-recognition';
import { createVoiceWebSocket, endSession } from '../lib/api';

const WS_RECONNECT_BASE_MS = 1000;
const WS_RECONNECT_MAX_MS = 16000;
const WS_MAX_RETRIES = 5;

export default function CameraSession() {
  const navigate = useNavigate();
  const { currentSession, wpm, fillerCount, setWpm, setFillerCount } =
    useAppStore();
  const voiceStore = useVoiceStore();
  const cameraStore = useCameraStore();
  const { initialize, startCamera, stop: stopCamera } = useBodyLanguage();
  const { startRecording, stopRecording } = useAudioRecorder();
  const { speak, stop: stopSpeech } = useTextToSpeech();
  const { transcript, startListening: startSpeech, stopListening: stopSpeechRecognition, clearTranscript } = useSpeechRecognition();

  const transcriptRef = useRef('');

  const [elapsed, setElapsed] = useState(0);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [fillerFlash, setFillerFlash] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isThinking, setIsThinking] = useState(false);

  const wsRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const welcomePlayedRef = useRef(false);
  const [wsStatus, setWsStatus] = useState('idle');
  const feedRef = useRef(null);

  const isDemo = !currentSession;

  const displaySession = currentSession || { session_id: 'demo', scenario: { title: 'Camera Practice Demo' } };

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDemo && !aiQuestion) {
      setAiQuestion(
        'Walk me through how you handle high-pressure deadlines. What strategies do you use?'
      );
    }
  }, [isDemo, aiQuestion]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
        if (!welcomePlayedRef.current) {
          welcomePlayedRef.current = true;
          await speak(msg);
        }
      } else if (data.type === 'ai_response') {
        setIsThinking(false);
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
  }, [currentSession, navigate, voiceStore, speak, setFillerCount, setWpm]);

  useEffect(() => {
    if (!currentSession) return;

    connectWs();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(1000); } catch { /* ignore */ }
      }
      welcomePlayedRef.current = false;
      stopSpeech();
    };
  }, [currentSession, connectWs, stopSpeech]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const ok = await initialize();
      if (cancelled) return;

      if (!ok) {
        setInitError('Failed to load body language models. Please refresh.');
        return;
      }

      await new Promise((r) => setTimeout(r, 100));

      if (cancelled) return;
      const feed = feedRef.current;
      if (feed?.video && feed?.canvas) {
        const started = await startCamera(feed.video, feed.canvas);
        if (!cancelled && started) {
          setCameraReady(true);
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      stopCamera();
      cameraStore.reset();
    };
  }, [initialize, startCamera, stopCamera, cameraStore]);

  const handleHoldStart = useCallback(async () => {
    setIsHolding(true);
    stopSpeech();
    voiceStore.setState('listening');
    await startRecording();
    startSpeech();
  }, [startRecording, stopSpeech, voiceStore, startSpeech]);

  const handleHoldEnd = useCallback(async () => {
    if (!isHolding) return;
    setIsHolding(false);
    voiceStore.setState('processing');
    setIsThinking(true);
    await stopRecording();
    stopSpeechRecognition();

    if (isDemo) {
      clearTranscript();
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const text = transcriptRef.current.trim() || 'I understand your point and would like to respond...';
      wsRef.current.send(JSON.stringify({ type: 'user_audio_transcript', text }));
      clearTranscript();
    }
  }, [stopRecording, voiceStore, isHolding, stopSpeechRecognition, clearTranscript, isDemo]);

  const handleEnd = async () => {
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
        background: '#f5f5f7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
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
          onClick={() => navigate('/')}
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
              color: '#1d1d1f',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📷 {displaySession.scenario?.title || 'Camera Mode'}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#86868b',
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
          padding: '16px 24px',
          gap: 24,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: 320,
            flexShrink: 0,
          }}
        >
          <WebcamFeed ref={feedRef} width={320} height={240} />

          {cameraStore.isLoading && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(102,126,234,0.08)',
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                color: '#667eea',
                textAlign: 'center',
              }}
            >
              ⏳ Loading MediaPipe models...
            </div>
          )}

          {initError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(244,63,94,0.08)',
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                color: '#f43f5e',
                textAlign: 'center',
              }}
            >
              {initError}
            </div>
          )}

          {cameraReady && <BodyLanguageHUD />}
        </motion.div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            overflow: 'hidden',
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
            <VoiceOrbScene size={380} />
          </motion.div>

          <motion.div
            key={aiQuestion}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 17,
              color: '#1d1d1f',
              textAlign: 'center',
              maxWidth: 480,
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            "{aiQuestion}"
          </motion.div>

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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', gap: 20 }}
          >
            {[
              { label: 'WPM', value: wpm, icon: '🗣️' },
              { label: 'Fillers', value: fillerCount, icon: '⚠️', flash: fillerFlash },
              { label: 'Time', value: formatTime(elapsed), icon: '⏱️', isText: true },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: '14px 20px',
                  textAlign: 'center',
                  minWidth: 80,
                  border: stat.flash
                    ? '1.5px solid rgba(244,63,94,0.4)'
                    : '1px solid rgba(0,0,0,0.06)',
                  boxShadow: stat.flash
                    ? '0 0 20px rgba(244,63,94,0.15)'
                    : '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#1d1d1f',
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
                    fontSize: 11,
                    color: '#86868b',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 20px' }}>
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
            border: 'none',
            cursor: 'pointer',
          }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}
