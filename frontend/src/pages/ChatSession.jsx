import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GradientButton } from '../components/ui/GradientButton';
import { sendMessage, endSession } from '../lib/api';
import { useAppStore } from '../store/app-store';

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#86868b',
          }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 30 : -30, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '14px 18px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : '#ffffff',
          color: isUser ? '#ffffff' : '#1d1d1f',
          fontFamily: "'Inter', sans-serif",
          fontSize: 15,
          lineHeight: 1.6,
          boxShadow: isUser
            ? '0 2px 12px rgba(102,126,234,0.2)'
            : '0 2px 12px rgba(0,0,0,0.04)',
          border: isUser ? 'none' : '1px solid rgba(0,0,0,0.04)',
        }}
      >
        {!isUser && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#86868b',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            AI Coach
          </div>
        )}
        {message.content}
      </div>
    </motion.div>
  );
}

export default function ChatSession() {
  const navigate = useNavigate();
  const { currentSession, currentScenario, chatMessages, addChatMessage, isAiTyping, setIsAiTyping } =
    useAppStore();

  const [input, setInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const openingAddedRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    if (currentScenario?.opening && chatMessages.length === 0 && openingAddedRef.current !== currentScenario.id) {
      openingAddedRef.current = currentScenario.id;
      addChatMessage('assistant', currentScenario.opening);
    }
  }, [currentScenario, chatMessages.length, addChatMessage]);

  useEffect(() => {
    if (!currentSession) navigate('/');
  }, [currentSession, navigate]);

  const handleSend = async () => {
    if (!input.trim() || isAiTyping) return;

    const msg = input.trim();
    setInput('');
    addChatMessage('user', msg);
    setIsAiTyping(true);

    try {
      const data = await sendMessage(currentSession.session_id, msg);
      addChatMessage('assistant', data.response, data.analysis);
    } catch {
      addChatMessage('assistant', 'Sorry, something went wrong. Please try again.');
    }

    setIsAiTyping(false);
    inputRef.current?.focus();
  };

  const handleEnd = async () => {
    try {
      await endSession(currentSession.session_id);
      navigate(`/feedback/${currentSession.session_id}`);
    } catch (_err) {
      console.error('Failed to end session:', _err);
      navigate(`/feedback/${currentSession.session_id}`);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentSession) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
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
            }}
          >
            {currentScenario?.title}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#86868b',
            }}
          >
            {currentScenario?.difficulty}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#86868b',
            fontWeight: 500,
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          ⏱ {formatTime(elapsed)}
        </div>
      </motion.header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <AnimatePresence>
          {chatMessages.map((msg, i) => (
            <ChatBubble key={msg.id} message={msg} index={i} />
          ))}
        </AnimatePresence>

        {isAiTyping && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: '#ffffff',
              borderRadius: '18px 18px 18px 4px',
              padding: '14px 18px',
              display: 'inline-block',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#f5f5f7',
              borderRadius: 14,
              padding: '14px 18px',
              border: '1px solid rgba(0,0,0,0.06)',
              transition: 'border-color 0.3s',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your response..."
              rows={1}
              style={{
                width: '100%',
                resize: 'none',
                fontSize: 15,
                fontFamily: "'Inter', sans-serif",
                color: '#1d1d1f',
                lineHeight: 1.5,
              }}
            />
          </div>
          <GradientButton
            onClick={handleSend}
            disabled={!input.trim() || isAiTyping}
            size="md"
            style={{ minWidth: 48, padding: '14px 20px' }}
          >
            ➤
          </GradientButton>
        </div>

        {chatMessages.length >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: 720,
              margin: '12px auto 0',
              textAlign: 'right',
            }}
          >
            <button
              onClick={handleEnd}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: '#f43f5e',
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(244,63,94,0.06)',
                transition: 'background 0.2s',
              }}
            >
              End Session
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
