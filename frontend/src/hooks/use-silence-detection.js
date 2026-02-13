import { useRef, useCallback } from 'react';

export function useSilenceDetection(
  onSilence,
  { threshold = 0.04, durationMs = 2000 } = {}
) {
  const rafRef = useRef(null);
  const silenceStartRef = useRef(null);
  const firedRef = useRef(false);
  const analyserRef = useRef(null);
  const onSilenceRef = useRef(onSilence);

  useCallback((cb) => {
    onSilenceRef.current = cb;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    silenceStartRef.current = null;
    firedRef.current = false;
    analyserRef.current = null;
  }, []);

  const attachAnalyser = useCallback(
    (analyser) => {
      stop();
      analyserRef.current = analyser;
      firedRef.current = false;
      silenceStartRef.current = null;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function loop() {
        rafRef.current = requestAnimationFrame(loop);

        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = avg / 128;

        if (level < threshold) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = performance.now();
          } else if (
            !firedRef.current &&
            performance.now() - silenceStartRef.current >= durationMs
          ) {
            firedRef.current = true;
            if (onSilenceRef.current) {
              onSilenceRef.current();
            }
          }
        } else {
          silenceStartRef.current = null;
          firedRef.current = false;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [threshold, durationMs, stop]
  );

  return { attachAnalyser, detach: stop };
}
