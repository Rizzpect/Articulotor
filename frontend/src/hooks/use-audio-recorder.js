import { useRef, useCallback, useEffect } from 'react';
import { useVoiceStore } from '../store/voice-store';

export function useAudioRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

  const resetState = useCallback(() => {
    useVoiceStore.getState().setAudioLevel(0);
    useVoiceStore.getState().setState('idle');
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (_e) { /* ignore */ }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let audioContext;
      try {
        audioContext = new AudioContext();
      } catch (err) {
        console.error('Failed to create AudioContext:', err);
        resetState();
        return false;
      }
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      function analyzeLoop() {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        useVoiceStore.getState().setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(analyzeLoop);
      }
      analyzeLoop();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      useVoiceStore.getState().setState('listening');

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      resetState();
      return false;
    }
  }, [resetState]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve(null);
      }, 5000);

      mediaRecorder.onstop = () => {
        clearTimeout(timeoutId);
        const audioBlob = audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
          : null;
        resolve(audioBlob);
      };

      mediaRecorder.stop();

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      resetState();
    });
  }, [resetState]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { startRecording, stopRecording, analyserRef };
}
