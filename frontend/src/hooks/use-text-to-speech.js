import { useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '../store/voice-store';

export function useTextToSpeech() {
  const intervalRef = useRef(null);
  const { setAudioLevel, setState } = useVoiceStore();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        setState('speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1;

        utterance.onstart = () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            setAudioLevel(0.3 + Math.random() * 0.4);
          }, 100);
        };

        utterance.onend = () => {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setAudioLevel(0);
          setState('idle');
          resolve();
        };

        utterance.onerror = (event) => {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setAudioLevel(0);
          
          if (event.error === 'interrupted' || event.error === 'canceled') {
            setState('idle');
            resolve();
          } else {
            console.error('Speech synthesis error:', event.error);
            setState('idle');
            resolve();
          }
        };

        speechSynthesis.speak(utterance);
      });
    },
    [setAudioLevel, setState]
  );

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    speechSynthesis.cancel();
    setAudioLevel(0);
    setState('idle');
  }, [setAudioLevel, setState]);

  return { speak, stop };
}
