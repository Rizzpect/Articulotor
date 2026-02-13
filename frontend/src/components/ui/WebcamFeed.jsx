import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * WebcamFeed — shows the live video with a canvas overlay for landmarks.
 * Parent passes videoRef + canvasRef so use-body-language can access them,
 * or you can grab them from the imperative handle.
 */
export const WebcamFeed = forwardRef(function WebcamFeed(
  { width = 320, height = 240, style },
  ref
) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    get video() { return videoRef.current; },
    get canvas() { return canvasRef.current; },
  }));

  // Keep canvas size in sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleResize() {
      const c = canvasRef.current;
      if (c && video.videoWidth) {
        c.width = video.videoWidth;
        c.height = video.videoHeight;
      }
    }

    video.addEventListener('loadedmetadata', handleResize);
    return () => video.removeEventListener('loadedmetadata', handleResize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
        background: '#1a1a2e',
        ...style,
      }}
    >
      {/* Webcam video — mirrored for natural interaction */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: 'block',
        }}
      />

      {/* Landmark overlay canvas — same mirror transform */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: 'scaleX(-1)',
          pointerEvents: 'none',
        }}
      />

      {/* Corner frame decorations */}
      {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((corner) => {
        const isTop = corner.includes('top');
        const isLeft = corner.includes('Left');
        return (
          <div
            key={corner}
            style={{
              position: 'absolute',
              top: isTop ? 6 : 'auto',
              bottom: isTop ? 'auto' : 6,
              left: isLeft ? 6 : 'auto',
              right: isLeft ? 'auto' : 6,
              width: 18,
              height: 18,
              borderTop: isTop ? '2px solid rgba(102,126,234,0.5)' : 'none',
              borderBottom: isTop ? 'none' : '2px solid rgba(102,126,234,0.5)',
              borderLeft: isLeft ? '2px solid rgba(102,126,234,0.5)' : 'none',
              borderRight: isLeft ? 'none' : '2px solid rgba(102,126,234,0.5)',
              borderRadius: 3,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Live indicator dot */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 6px rgba(239,68,68,0.8)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
        LIVE
      </div>
    </motion.div>
  );
});
