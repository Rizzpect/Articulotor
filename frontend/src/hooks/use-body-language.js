import { useRef, useCallback, useEffect } from 'react';
import { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { useCameraStore } from '../store/camera-store';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models';

const FACE_MODEL = `${MODEL_CDN}/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`;
const POSE_MODEL = `${MODEL_CDN}/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`;
const HAND_MODEL = `${MODEL_CDN}/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`;

const ANALYSIS_INTERVAL_MS = 66;

export function useBodyLanguage() {
  const faceLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const lastAnalysisRef = useRef(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelsLoadedRef = useRef(false);
  const stopCallbackRef = useRef(null);

  const prevHandPosRef = useRef(null);
  const gestureCountRef = useRef(0);
  const nervousCountRef = useRef(0);

  const initialize = useCallback(async () => {
    const store = useCameraStore.getState();
    store.setLoading(true);
    store.setError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      const [faceLandmarker, poseLandmarker, handLandmarker] = await Promise.all([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          numFaces: 1,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
      ]);

      faceLandmarkerRef.current = faceLandmarker;
      poseLandmarkerRef.current = poseLandmarker;
      handLandmarkerRef.current = handLandmarker;
      modelsLoadedRef.current = true;

      store.setLoading(false);
      return true;
    } catch (err) {
      console.error('MediaPipe initialization failed:', err);
      store.setError('Failed to load body language models');
      store.setLoading(false);
      modelsLoadedRef.current = false;
      return false;
    }
  }, []);

  const startCamera = useCallback(async (videoElement, canvasElement) => {
    if (!modelsLoadedRef.current) {
      console.error('Models not loaded. Call initialize() first.');
      useCameraStore.getState().setError('Models not loaded. Please initialize first.');
      return false;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    videoRef.current = videoElement;
    canvasRef.current = canvasElement;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      videoElement.srcObject = stream;
      await videoElement.play();

      useCameraStore.getState().setActive(true);

      function loop() {
        rafRef.current = requestAnimationFrame(loop);

        const now = performance.now();
        if (now - lastAnalysisRef.current < ANALYSIS_INTERVAL_MS) return;
        lastAnalysisRef.current = now;

        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        const timestamp = Math.round(now);

        let faceResults = null;
        let poseResults = null;
        let handResults = null;

        try {
          if (faceLandmarkerRef.current) {
            faceResults = faceLandmarkerRef.current.detectForVideo(video, timestamp);
          }
        } catch (err) {
          console.error('Face detection error:', err);
        }

        try {
          if (poseLandmarkerRef.current) {
            poseResults = poseLandmarkerRef.current.detectForVideo(video, timestamp + 1);
          }
        } catch (err) {
          console.error('Pose detection error:', err);
        }

        try {
          if (handLandmarkerRef.current) {
            handResults = handLandmarkerRef.current.detectForVideo(video, timestamp + 2);
          }
        } catch (err) {
          console.error('Hand detection error:', err);
        }

        const metrics = {};

        if (faceResults?.faceLandmarks?.length > 0) {
          metrics.eyeContact = calculateEyeContact(faceResults.faceLandmarks[0]);
        }

        if (faceResults?.faceBlendshapes?.length > 0) {
          metrics.expression = detectExpression(faceResults.faceBlendshapes[0]);
        }

        if (poseResults?.landmarks?.length > 0) {
          metrics.posture = calculatePosture(poseResults.landmarks[0]);
        }

        if (handResults?.landmarks?.length > 0) {
          const gestureInfo = analyzeHands(
            handResults.landmarks,
            faceResults?.faceLandmarks?.[0],
            prevHandPosRef.current
          );
          prevHandPosRef.current = handResults.landmarks[0];

          if (gestureInfo.emphatic) {
            gestureCountRef.current += 1;
          }
          metrics.gestureCount = gestureCountRef.current;

          if (gestureInfo.touchingFace) {
            nervousCountRef.current += 1;
            metrics.nervousHabit = true;
          }
        } else {
          prevHandPosRef.current = null;
        }

        useCameraStore.getState().updateMetrics(metrics);

        drawLandmarks(canvasRef.current, video, faceResults, poseResults, handResults);
      }

      rafRef.current = requestAnimationFrame(loop);
      return true;
    } catch (err) {
      console.error('Camera access failed:', err);
      useCameraStore.getState().setError('Camera access denied');
      useCameraStore.getState().setActive(false);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    faceLandmarkerRef.current?.close();
    poseLandmarkerRef.current?.close();
    handLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    poseLandmarkerRef.current = null;
    handLandmarkerRef.current = null;

    gestureCountRef.current = 0;
    nervousCountRef.current = 0;
    prevHandPosRef.current = null;

    useCameraStore.getState().setActive(false);
  }, []);

  useEffect(() => {
    stopCallbackRef.current = stop;
  }, [stop]);

  useEffect(() => {
    return () => {
      if (stopCallbackRef.current) {
        stopCallbackRef.current();
      }
    };
  }, []);

  return { initialize, startCamera, stop };
}

function calculateEyeContact(faceLandmarks) {
  if (faceLandmarks.length < 478) return 50;

  const leftIris = faceLandmarks[468];
  const rightIris = faceLandmarks[473];
  const leftEyeInner = faceLandmarks[133];
  const leftEyeOuter = faceLandmarks[33];
  const rightEyeInner = faceLandmarks[362];
  const rightEyeOuter = faceLandmarks[263];

  const leftEyeWidth = Math.abs(leftEyeOuter.x - leftEyeInner.x);
  const leftIrisPos = leftEyeWidth > 0
    ? (leftIris.x - leftEyeOuter.x) / leftEyeWidth
    : 0.5;

  const rightEyeWidth = Math.abs(rightEyeInner.x - rightEyeOuter.x);
  const rightIrisPos = rightEyeWidth > 0
    ? (rightIris.x - rightEyeOuter.x) / rightEyeWidth
    : 0.5;

  const leftDeviation = Math.abs(leftIrisPos - 0.5) * 2;
  const rightDeviation = Math.abs(rightIrisPos - 0.5) * 2;
  const avgDeviation = (leftDeviation + rightDeviation) / 2;

  const noseTip = faceLandmarks[1];
  const forehead = faceLandmarks[10];
  const headTilt = Math.abs(noseTip.z - forehead.z);

  const score = Math.max(0, Math.min(100, (1 - avgDeviation - headTilt * 2) * 100));
  return Math.round(score);
}

function detectExpression(blendshapes) {
  const bs = {};
  for (const shape of blendshapes.categories) {
    bs[shape.categoryName] = shape.score;
  }

  const smile = ((bs['mouthSmileLeft'] || 0) + (bs['mouthSmileRight'] || 0)) / 2;
  const browDown = ((bs['browDownLeft'] || 0) + (bs['browDownRight'] || 0)) / 2;
  const browUp = ((bs['browInnerUp'] || 0) + (bs['browOuterUpLeft'] || 0) + (bs['browOuterUpRight'] || 0)) / 3;
  const eyeSquint = ((bs['eyeSquintLeft'] || 0) + (bs['eyeSquintRight'] || 0)) / 2;

  if (smile > 0.4) return 'smiling';
  if (browDown > 0.3 && eyeSquint > 0.2) return 'tense';
  if (smile > 0.15 && browUp > 0.1) return 'confident';
  return 'neutral';
}

function calculatePosture(poseLandmarks) {
  const leftShoulder = poseLandmarks[11];
  const rightShoulder = poseLandmarks[12];
  const leftHip = poseLandmarks[23];
  const rightHip = poseLandmarks[24];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 50;

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const lateralLean = Math.abs(shoulderMidX - hipMidX);

  const shoulderMidZ = (leftShoulder.z + rightShoulder.z) / 2;
  const hipMidZ = (leftHip.z + rightHip.z) / 2;
  const forwardLean = Math.max(0, shoulderMidZ - hipMidZ);

  const tiltPenalty = shoulderTilt * 400;
  const leanPenalty = lateralLean * 300;
  const forwardPenalty = forwardLean * 200;

  const score = Math.max(0, Math.min(100, 100 - tiltPenalty - leanPenalty - forwardPenalty));
  return Math.round(score);
}

function analyzeHands(handLandmarks, faceLandmarks, prevWrist) {
  const result = { emphatic: false, touchingFace: false };

  if (handLandmarks.length === 0) return result;

  const wrist = handLandmarks[0][0];

  if (prevWrist) {
    const dx = wrist.x - prevWrist[0].x;
    const dy = wrist.y - prevWrist[0].y;
    const velocity = Math.sqrt(dx * dx + dy * dy);
    if (velocity > 0.04) {
      result.emphatic = true;
    }
  }

  if (faceLandmarks && faceLandmarks.length > 0) {
    const nose = faceLandmarks[1];
    for (const hand of handLandmarks) {
      for (const tipIdx of [4, 8, 12, 16, 20]) {
        const tip = hand[tipIdx];
        const dist = Math.sqrt(
          (tip.x - nose.x) ** 2 + (tip.y - nose.y) ** 2
        );
        if (dist < 0.08) {
          result.touchingFace = true;
          break;
        }
      }
      if (result.touchingFace) break;
    }
  }

  return result;
}

function drawLandmarks(canvas, video, faceResults, poseResults, handResults) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (faceResults?.faceLandmarks?.length > 0) {
    ctx.fillStyle = 'rgba(102, 126, 234, 0.35)';
    const face = faceResults.faceLandmarks[0];
    const keyIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
      33, 133, 362, 263, 468, 473,
      1, 4, 5, 6,
      61, 291, 0, 17,
    ];
    for (const i of keyIndices) {
      if (i < face.length) {
        ctx.beginPath();
        ctx.arc(face[i].x * w, face[i].y * h, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(102, 126, 234, 0.6)';
    ctx.lineWidth = 1.5;
    if (face.length > 473) {
      for (const irisCenter of [468, 473]) {
        ctx.beginPath();
        ctx.arc(face[irisCenter].x * w, face[irisCenter].y * h, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  if (poseResults?.landmarks?.length > 0) {
    const pose = poseResults.landmarks[0];
    ctx.strokeStyle = 'rgba(118, 75, 162, 0.5)';
    ctx.lineWidth = 2;

    const connections = [
      [11, 12],
      [11, 13], [13, 15],
      [12, 14], [14, 16],
      [11, 23], [12, 24],
      [23, 24],
    ];

    for (const [a, b] of connections) {
      if (pose[a] && pose[b]) {
        ctx.beginPath();
        ctx.moveTo(pose[a].x * w, pose[a].y * h);
        ctx.lineTo(pose[b].x * w, pose[b].y * h);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(118, 75, 162, 0.6)';
    for (const idx of [11, 12, 13, 14, 15, 16, 23, 24]) {
      if (pose[idx]) {
        ctx.beginPath();
        ctx.arc(pose[idx].x * w, pose[idx].y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (handResults?.landmarks?.length > 0) {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.lineWidth = 1.5;

    const handConnections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    for (const hand of handResults.landmarks) {
      for (const [a, b] of handConnections) {
        ctx.beginPath();
        ctx.moveTo(hand[a].x * w, hand[a].y * h);
        ctx.lineTo(hand[b].x * w, hand[b].y * h);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
      for (const lm of hand) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
